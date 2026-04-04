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
        const termMonths = loan.termMonths;
        const gracePeriodDays = loan.gracePeriodDays;
        const frequency = loan.repaymentFrequency;
        const interestMethod = loan.loanProduct.interestRateMethod;

        if (!termMonths) {
            throw new BadRequestException('Cannot generate schedule for a loan without a fixed term');
        }

        // Calculate number of installments based on frequency
        let totalInstallments: number;
        let intervalDays: number;

        switch (frequency) {
            case 'DAILY':
                totalInstallments = termMonths * 30;
                intervalDays = 1;
                break;
            case 'WEEKLY':
                totalInstallments = termMonths * 4;
                intervalDays = 7;
                break;
            case 'MONTHLY':
            default:
                totalInstallments = termMonths;
                intervalDays = 30;
                break;
        }

        const schedules: any[] = [];
        const startDate = new Date();

        // Add grace period
        if (gracePeriodDays > 0) {
            startDate.setDate(startDate.getDate() + gracePeriodDays);
        }

        if (method === 'BALLOON') {
            // Balloon payment: interest-only payments, principal at end
            schedules.push(
                ...this.generateBalloonSchedule(
                    principal,
                    annualRate,
                    totalInstallments,
                    intervalDays,
                    startDate,
                    interestMethod,
                    frequency,
                ),
            );
        } else {
            // EMI: Equal installments
            schedules.push(
                ...this.generateEMISchedule(
                    principal,
                    annualRate,
                    totalInstallments,
                    intervalDays,
                    startDate,
                    interestMethod,
                    frequency,
                ),
            );
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

        return {
            loanApplicationId,
            method,
            totalInstallments: created.length,
            totalPrincipal: principal,
            totalInterest: schedules.reduce((sum, s) => sum + s.interestAmount, 0),
            totalAmount: schedules.reduce((sum, s) => sum + s.totalAmount, 0),
            schedules: created,
        };
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
            const totalPerPeriod = principalPerPeriod + interestPerPeriod;

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
        interestMethod: string,
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

    // Get schedule for a loan
    async findByLoan(loanApplicationId: string) {
        const schedules = await this.prisma.repaymentSchedule.findMany({
            where: { loanApplicationId },
            orderBy: { installmentNumber: 'asc' },
        });

        if (schedules.length === 0) {
            throw new NotFoundException('No repayment schedule found for this loan');
        }

        const totalPrincipal = schedules.reduce((sum, s) => sum + Number(s.principalAmount), 0);
        const totalInterest = schedules.reduce((sum, s) => sum + Number(s.interestAmount), 0);
        const totalPaid = schedules.reduce((sum, s) => sum + Number(s.paidAmount), 0);
        const totalRemaining = schedules.reduce((sum, s) => sum + Number(s.remainingAmount), 0);

        return {
            loanApplicationId,
            totalInstallments: schedules.length,
            totalPrincipal: Math.round(totalPrincipal * 100) / 100,
            totalInterest: Math.round(totalInterest * 100) / 100,
            totalAmount: Math.round((totalPrincipal + totalInterest) * 100) / 100,
            totalPaid: Math.round(totalPaid * 100) / 100,
            totalRemaining: Math.round(totalRemaining * 100) / 100,
            schedules,
        };
    }
}
