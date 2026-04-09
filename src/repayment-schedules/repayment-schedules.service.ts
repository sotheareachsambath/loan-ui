import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RepaymentSchedulesService {
    constructor(private prisma: PrismaService) { }

    /**
     * Generate repayment schedule for an approved loan.
     * Supports:
     * - EMI (Equal Monthly Installment)
     * - Balloon payment (interest-only + lump-sum principal at end)
     * - Flat rate vs declining balance interest
     * - Grace period
     * - Multiple frequencies (daily, weekly, monthly)
     */
    async generateSchedule(loanApplicationId: string, method: string = 'EMI') {
        const loan = await this.prisma.loanApplication.findUnique({
            where: { id: loanApplicationId },
            include: { loanProduct: true },
        });

        if (!loan) {
            throw new NotFoundException('Loan application not found');
        }

        if (!['APPROVED', 'DISBURSED'].includes(loan.status)) {
            throw new BadRequestException('Loan must be APPROVED or DISBURSED to generate schedule');
        }

        // Delete existing schedule
        await this.prisma.repaymentSchedule.deleteMany({
            where: { loanApplicationId },
        });

        const principal = Number(loan.approvedAmount || loan.requestedAmount);
        const annualRate = Number(loan.interestRate);
        const gracePeriodDays = loan.gracePeriodDays;
        const frequency = loan.repaymentFrequency;
        const interestMethod = loan.loanProduct.interestRateMethod;
        const isFixedTerm = (loan.loanProduct as any).hasFixedTerm && !!loan.termMonths;

        let schedules: any[];

        if (!isFixedTerm) {
            // Non-fixed-term: generate projected interest-only schedule
            schedules = this.generateNonFixedSchedule(
                principal,
                annualRate,
                gracePeriodDays,
                frequency,
            );
        } else {
            // Fixed-term: generate EMI or Balloon schedule
            const termMonths = loan.termMonths!;
            const { totalInstallments, intervalDays } = this.getFrequencyParams(frequency, termMonths);

            const startDate = new Date();
            if (gracePeriodDays > 0) {
                startDate.setDate(startDate.getDate() + gracePeriodDays);
            }

            if (method === 'BALLOON') {
                schedules = this.generateBalloonSchedule(
                    principal, annualRate, totalInstallments, intervalDays, startDate, interestMethod, frequency,
                );
            } else {
                schedules = this.generateEMISchedule(
                    principal, annualRate, totalInstallments, intervalDays, startDate, interestMethod, frequency,
                );
            }
        }

        // Bulk create schedules
        const created = await Promise.all(
            schedules.map((schedule) =>
                this.prisma.repaymentSchedule.create({
                    data: {
                        loanApplicationId,
                        ...schedule,
                    },
                }),
            ),
        );

        const totalInterest = schedules.reduce((sum, s) => sum + s.interestAmount, 0);
        const totalPrincipal = schedules.reduce((sum, s) => sum + Number(s.principalAmount), 0);

        return {
            loanApplicationId,
            method: isFixedTerm ? method : 'INTEREST_ONLY',
            hasFixedTerm: isFixedTerm,
            totalInstallments: created.length,
            totalPrincipal: Math.round(totalPrincipal * 100) / 100,
            totalInterest: Math.round(totalInterest * 100) / 100,
            totalAmount: Math.round((totalPrincipal + totalInterest) * 100) / 100,
            schedules: created,
        };
    }

    /**
     * Generate interest-only schedule for non-fixed-term loans.
     * Creates 12 projected monthly interest payments based on current principal.
     * Principal is not scheduled — borrower repays principal at will.
     */
    private generateNonFixedSchedule(
        principal: number,
        annualRate: number,
        gracePeriodDays: number,
        frequency: string,
    ) {
        const schedules: any[] = [];
        const projectedPeriods = 12; // Project 12 periods ahead
        const periodsPerYear = frequency === 'DAILY' ? 365 : frequency === 'WEEKLY' ? 52 : 12;
        const periodicRate = annualRate / 100 / periodsPerYear;
        const intervalDays = frequency === 'DAILY' ? 1 : frequency === 'WEEKLY' ? 7 : 30;

        const startDate = new Date();
        if (gracePeriodDays > 0) {
            startDate.setDate(startDate.getDate() + gracePeriodDays);
        }

        for (let i = 1; i <= projectedPeriods; i++) {
            const dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() + intervalDays * i);

            const interestAmount = Math.round(principal * periodicRate * 100) / 100;

            schedules.push({
                installmentNumber: i,
                dueDate,
                principalAmount: 0, // No scheduled principal for non-fixed
                interestAmount,
                totalAmount: interestAmount,
                remainingAmount: interestAmount,
            });
        }

        return schedules;
    }

    /**
     * Regenerate remaining schedule entries for non-fixed loans after principal payment.
     * Updates future unpaid installments with recalculated interest based on new outstanding principal.
     */
    async regenerateNonFixedSchedule(loanApplicationId: string, newOutstandingPrincipal: number) {
        const loan = await this.prisma.loanApplication.findUnique({
            where: { id: loanApplicationId },
            include: { loanProduct: true },
        });

        if (!loan) return;

        const annualRate = Number(loan.interestRate);
        const frequency = loan.repaymentFrequency;
        const periodsPerYear = frequency === 'DAILY' ? 365 : frequency === 'WEEKLY' ? 52 : 12;
        const periodicRate = annualRate / 100 / periodsPerYear;
        const newInterestAmount = Math.round(newOutstandingPrincipal * periodicRate * 100) / 100;

        // Update all future PENDING installments with recalculated interest
        const pendingSchedules = await this.prisma.repaymentSchedule.findMany({
            where: {
                loanApplicationId,
                status: { in: ['PENDING'] },
            },
            orderBy: { installmentNumber: 'asc' },
        });

        for (const schedule of pendingSchedules) {
            await this.prisma.repaymentSchedule.update({
                where: { id: schedule.id },
                data: {
                    interestAmount: newInterestAmount,
                    totalAmount: newInterestAmount,
                    remainingAmount: newInterestAmount,
                },
            });
        }

        return { updatedCount: pendingSchedules.length, newInterestAmount };
    }

    private getFrequencyParams(frequency: string, termMonths: number) {
        switch (frequency) {
            case 'DAILY':
                return { totalInstallments: termMonths * 30, intervalDays: 1 };
            case 'WEEKLY':
                return { totalInstallments: termMonths * 4, intervalDays: 7 };
            case 'MONTHLY':
            default:
                return { totalInstallments: termMonths, intervalDays: 30 };
        }
    }

    /**
     * EMI calculation
     * Flat Rate: Total Interest = Principal × Rate × Term, divided equally
     * Declining Balance: Standard EMI formula
     */
    private generateEMISchedule(
        principal: number,
        annualRate: number,
        totalInstallments: number,
        intervalDays: number,
        startDate: Date,
        interestMethod: string,
        frequency: string,
    ) {
        const schedules: any[] = [];

        if (interestMethod === 'FLAT_RATE') {
            // Flat rate: interest calculated on original principal
            const periodsPerYear = frequency === 'DAILY' ? 365 : frequency === 'WEEKLY' ? 52 : 12;
            const periodicRate = annualRate / 100 / periodsPerYear;
            const totalInterest = principal * periodicRate * totalInstallments;
            const interestPerPeriod = totalInterest / totalInstallments;
            const principalPerPeriod = principal / totalInstallments;
            let remainingPrincipal = principal;

            for (let i = 1; i <= totalInstallments; i++) {
                const dueDate = new Date(startDate);
                dueDate.setDate(dueDate.getDate() + intervalDays * i);

                const principalAmount = i === totalInstallments
                    ? remainingPrincipal
                    : Math.round(principalPerPeriod * 100) / 100;

                remainingPrincipal -= principalAmount;

                schedules.push({
                    installmentNumber: i,
                    dueDate,
                    principalAmount,
                    interestAmount: Math.round(interestPerPeriod * 100) / 100,
                    totalAmount: Math.round((principalAmount + interestPerPeriod) * 100) / 100,
                    remainingAmount: Math.round((principalAmount + interestPerPeriod) * 100) / 100,
                });
            }
        } else {
            // Declining balance: EMI formula
            const periodsPerYear = frequency === 'DAILY' ? 365 : frequency === 'WEEKLY' ? 52 : 12;
            const periodicRate = annualRate / 100 / periodsPerYear;

            // EMI = P × r × (1+r)^n / ((1+r)^n - 1)
            let emi: number;
            if (periodicRate === 0) {
                emi = principal / totalInstallments;
            } else {
                emi =
                    (principal * periodicRate * Math.pow(1 + periodicRate, totalInstallments)) /
                    (Math.pow(1 + periodicRate, totalInstallments) - 1);
            }

            emi = Math.round(emi * 100) / 100;
            let remainingPrincipal = principal;

            for (let i = 1; i <= totalInstallments; i++) {
                const dueDate = new Date(startDate);
                dueDate.setDate(dueDate.getDate() + intervalDays * i);

                const interestAmount = Math.round(remainingPrincipal * periodicRate * 100) / 100;
                let principalAmount: number;

                if (i === totalInstallments) {
                    // Last installment: pay remaining principal
                    principalAmount = Math.round(remainingPrincipal * 100) / 100;
                } else {
                    principalAmount = Math.round((emi - interestAmount) * 100) / 100;
                }

                const totalAmount = principalAmount + interestAmount;
                remainingPrincipal -= principalAmount;

                schedules.push({
                    installmentNumber: i,
                    dueDate,
                    principalAmount,
                    interestAmount,
                    totalAmount: Math.round(totalAmount * 100) / 100,
                    remainingAmount: Math.round(totalAmount * 100) / 100,
                });
            }
        }

        return schedules;
    }

    /**
     * Balloon payment: Pay only interest during term, full principal at end
     */
    private generateBalloonSchedule(
        principal: number,
        annualRate: number,
        totalInstallments: number,
        intervalDays: number,
        startDate: Date,
        _interestMethod: string,
        frequency: string,
    ) {
        const schedules: any[] = [];
        const periodsPerYear = frequency === 'DAILY' ? 365 : frequency === 'WEEKLY' ? 52 : 12;
        const periodicRate = annualRate / 100 / periodsPerYear;

        for (let i = 1; i <= totalInstallments; i++) {
            const dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() + intervalDays * i);

            const interestAmount = Math.round(principal * periodicRate * 100) / 100;
            const principalAmount = i === totalInstallments ? principal : 0;
            const totalAmount = principalAmount + interestAmount;

            schedules.push({
                installmentNumber: i,
                dueDate,
                principalAmount,
                interestAmount,
                totalAmount: Math.round(totalAmount * 100) / 100,
                remainingAmount: Math.round(totalAmount * 100) / 100,
            });
        }

        return schedules;
    }

    // Get schedule for a loan (works for both fixed and non-fixed term)
    async findByLoan(loanApplicationId: string) {
        const loan = await this.prisma.loanApplication.findUnique({
            where: { id: loanApplicationId },
            include: {
                loanProduct: true,
                disbursements: true,
                repayments: true,
            },
        });

        if (!loan) {
            throw new NotFoundException('Loan application not found');
        }

        const isFixedTerm = (loan.loanProduct as any).hasFixedTerm && !!loan.termMonths;

        const schedules = await this.prisma.repaymentSchedule.findMany({
            where: { loanApplicationId },
            orderBy: { installmentNumber: 'asc' },
        });

        if (schedules.length === 0) {
            return {
                loanApplicationId,
                hasFixedTerm: isFixedTerm,
                totalInstallments: 0,
                totalPrincipal: 0,
                totalInterest: 0,
                totalAmount: 0,
                totalPaid: 0,
                totalRemaining: 0,
                schedules: [],
            };
        }

        const totalPrincipal = schedules.reduce((sum, s) => sum + Number(s.principalAmount), 0);
        const totalInterest = schedules.reduce((sum, s) => sum + Number(s.interestAmount), 0);
        const totalPaid = schedules.reduce((sum, s) => sum + Number(s.paidAmount), 0);
        const totalRemaining = schedules.reduce((sum, s) => sum + Number(s.remainingAmount), 0);

        const result: any = {
            loanApplicationId,
            hasFixedTerm: isFixedTerm,
            totalInstallments: schedules.length,
            totalPrincipal: Math.round(totalPrincipal * 100) / 100,
            totalInterest: Math.round(totalInterest * 100) / 100,
            totalAmount: Math.round((totalPrincipal + totalInterest) * 100) / 100,
            totalPaid: Math.round(totalPaid * 100) / 100,
            totalRemaining: Math.round(totalRemaining * 100) / 100,
            schedules,
        };

        // For non-fixed loans, include outstanding principal info
        if (!isFixedTerm) {
            const totalDisbursed = loan.disbursements
                .filter((d) => d.status === 'COMPLETED')
                .reduce((sum, d) => sum + Number(d.amount), 0);
            const loanAmount = totalDisbursed || Number(loan.approvedAmount || loan.requestedAmount);
            const totalPrincipalRepaid = loan.repayments.reduce(
                (sum, r) => sum + Number(r.principalPortion), 0,
            );
            result.loanAmount = loanAmount;
            result.outstandingPrincipal = Math.round((loanAmount - totalPrincipalRepaid) * 100) / 100;
            result.totalPrincipalRepaid = Math.round(totalPrincipalRepaid * 100) / 100;
        }

        return result;
    }
}
