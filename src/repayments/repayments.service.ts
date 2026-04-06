import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRepaymentDto } from './dto/create-repayment.dto';

@Injectable()
export class RepaymentsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Record a payment.
     * - Allocates payment to the earliest unpaid/partially-paid installments
     * - Supports early repayment / prepayment
     * - Updates schedule status accordingly
     */
    async create(dto: CreateRepaymentDto) {
        const loan = await this.prisma.loanApplication.findUnique({
            where: { id: dto.loanApplicationId },
            include: {
                loanProduct: true,
                disbursements: true,
                repaymentSchedules: {
                    where: { status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] } },
                    orderBy: { installmentNumber: 'asc' },
                },
            },
        });

        if (!loan) {
            throw new NotFoundException('Loan application not found');
        }

        if (loan.status !== 'DISBURSED') {
            throw new BadRequestException('Loan must be DISBURSED to accept payments');
        }

        // Non-fixed-term loans:
        // - REGULAR payments = interest only (borrower pays interest periodically)
        // - EARLY_REPAYMENT / PREPAYMENT = principal repayment (loan closes when full principal is returned)
        if (!(loan.loanProduct as any).hasFixedTerm || !loan.termMonths) {
            const totalDisbursed = loan.disbursements
                .filter((d) => d.status === 'COMPLETED')
                .reduce((sum, d) => sum + Number(d.amount), 0);
            const loanAmount = totalDisbursed || Number(loan.approvedAmount || loan.requestedAmount);
            const monthlyRate = Number(loan.interestRate) / 100; // interestRate is monthly %

            // Get previous repayments to calculate outstanding principal
            const previousRepayments = await this.prisma.repayment.findMany({
                where: { loanApplicationId: dto.loanApplicationId },
            });

            const totalPrincipalPaid = previousRepayments.reduce(
                (sum, r) => sum + Number(r.principalPortion), 0,
            );
            const outstandingPrincipal = Math.round((loanAmount - totalPrincipalPaid) * 100) / 100;

            if (outstandingPrincipal <= 0) {
                throw new BadRequestException('This loan is already fully paid');
            }

            const repaymentType = dto.repaymentType || 'REGULAR';
            let principalPortion = 0;
            let interestPortion = 0;

            if (repaymentType === 'REGULAR') {
                // REGULAR = interest-only payment
                const interestDue = Math.round(outstandingPrincipal * monthlyRate * 100) / 100;

                if (dto.amount < interestDue) {
                    throw new BadRequestException(
                        `Interest payment must be at least ${interestDue} (${outstandingPrincipal} × ${loan.interestRate}%)`,
                    );
                }
                if (dto.amount > interestDue) {
                    throw new BadRequestException(
                        `Interest-only payment should be exactly ${interestDue}. To repay principal, use repaymentType EARLY_REPAYMENT or PREPAYMENT`,
                    );
                }

                interestPortion = dto.amount;
            } else {
                // EARLY_REPAYMENT / PREPAYMENT = paying back principal
                if (dto.amount > outstandingPrincipal) {
                    throw new BadRequestException(
                        `Payment amount (${dto.amount}) exceeds outstanding principal (${outstandingPrincipal})`,
                    );
                }

                principalPortion = dto.amount;
            }

            const newOutstandingPrincipal = Math.round((outstandingPrincipal - principalPortion) * 100) / 100;
            const isFullyPaid = newOutstandingPrincipal <= 0;

            const result = await this.prisma.$transaction(async (tx) => {
                const repayment = await tx.repayment.create({
                    data: {
                        loanApplicationId: dto.loanApplicationId,
                        collectedById: dto.collectedById,
                        amount: dto.amount,
                        principalPortion,
                        interestPortion,
                        penaltyPortion: 0,
                        repaymentType: repaymentType as any,
                        paymentMethod: dto.paymentMethod,
                        referenceNumber: dto.referenceNumber,
                        notes: dto.notes,
                    },
                });

                // Close the loan when full principal is repaid
                if (isFullyPaid) {
                    await tx.loanApplication.update({
                        where: { id: dto.loanApplicationId },
                        data: { status: 'CLOSED' },
                    });
                }

                return repayment;
            });

            return {
                repayment: result,
                allocation: {
                    principalPaid: principalPortion,
                    interestPaid: interestPortion,
                    penaltyPaid: 0,
                    totalPaid: dto.amount,
                    schedulesAffected: 0,
                    hasFixedTerm: false,
                    loanAmount,
                    outstandingPrincipal: newOutstandingPrincipal,
                    totalPrincipalRepaid: Math.round((totalPrincipalPaid + principalPortion) * 100) / 100,
                    loanClosed: isFullyPaid,
                },
            };
        }

        if (loan.repaymentSchedules.length === 0) {
            throw new BadRequestException('No outstanding installments found');
        }

        let remainingPayment = dto.amount;
        let totalPrincipalPaid = 0;
        let totalInterestPaid = 0;
        let totalPenaltyPaid = 0;
        const updatedSchedules: any[] = [];

        // Allocate payment to installments in order
        for (const schedule of loan.repaymentSchedules) {
            if (remainingPayment <= 0) break;

            const outstanding = Number(schedule.remainingAmount);
            const penaltyDue = Number(schedule.penaltyAmount);
            const principalDue = Number(schedule.principalAmount) - (Number(schedule.paidAmount) > Number(schedule.interestAmount) + penaltyDue
                ? Number(schedule.paidAmount) - Number(schedule.interestAmount) - penaltyDue
                : 0);
            const interestDue = Number(schedule.interestAmount);

            let paymentForSchedule = Math.min(remainingPayment, outstanding);

            // Pay penalty first, then interest, then principal
            let penaltyPayment = Math.min(paymentForSchedule, penaltyDue);
            paymentForSchedule -= penaltyPayment;
            totalPenaltyPaid += penaltyPayment;

            let interestPayment = Math.min(paymentForSchedule, interestDue);
            paymentForSchedule -= interestPayment;
            totalInterestPaid += interestPayment;

            let principalPayment = paymentForSchedule;
            totalPrincipalPaid += principalPayment;

            const totalPaidForSchedule = penaltyPayment + interestPayment + principalPayment;
            const newPaidAmount = Number(schedule.paidAmount) + totalPaidForSchedule;
            const newRemainingAmount = outstanding - totalPaidForSchedule;
            const isFullyPaid = newRemainingAmount <= 0.01; // Tolerance for rounding

            updatedSchedules.push({
                id: schedule.id,
                paidAmount: Math.round(newPaidAmount * 100) / 100,
                remainingAmount: Math.round(Math.max(newRemainingAmount, 0) * 100) / 100,
                status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
                paidAt: isFullyPaid ? new Date() : null,
            });

            remainingPayment -= totalPaidForSchedule;
        }

        // Execute in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Update all affected schedules
            for (const update of updatedSchedules) {
                await tx.repaymentSchedule.update({
                    where: { id: update.id },
                    data: {
                        paidAmount: update.paidAmount,
                        remainingAmount: update.remainingAmount,
                        status: update.status as any,
                        paidAt: update.paidAt,
                    },
                });
            }

            // Create repayment record
            const repayment = await tx.repayment.create({
                data: {
                    loanApplicationId: dto.loanApplicationId,
                    collectedById: dto.collectedById,
                    amount: dto.amount,
                    principalPortion: Math.round(totalPrincipalPaid * 100) / 100,
                    interestPortion: Math.round(totalInterestPaid * 100) / 100,
                    penaltyPortion: Math.round(totalPenaltyPaid * 100) / 100,
                    repaymentType: (dto.repaymentType || 'REGULAR') as any,
                    paymentMethod: dto.paymentMethod,
                    referenceNumber: dto.referenceNumber,
                    notes: dto.notes,
                },
            });

            // Check if all installments are paid → close loan
            const remainingSchedules = await tx.repaymentSchedule.count({
                where: {
                    loanApplicationId: dto.loanApplicationId,
                    status: { not: 'PAID' },
                },
            });

            if (remainingSchedules === 0) {
                await tx.loanApplication.update({
                    where: { id: dto.loanApplicationId },
                    data: { status: 'CLOSED' },
                });
            }

            return repayment;
        });

        return {
            repayment: result,
            allocation: {
                principalPaid: Math.round(totalPrincipalPaid * 100) / 100,
                interestPaid: Math.round(totalInterestPaid * 100) / 100,
                penaltyPaid: Math.round(totalPenaltyPaid * 100) / 100,
                totalPaid: dto.amount,
                schedulesAffected: updatedSchedules.length,
            },
        };
    }

    // Get all repayments across all loans
    async findAll() {
        const repayments = await this.prisma.repayment.findMany({
            include: {
                collectedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                loanApplication: {
                    select: { id: true, applicationNumber: true, status: true, currency: true },
                },
            },
            orderBy: { paidAt: 'desc' },
        });

        const totalPaid = repayments.reduce((sum, r) => sum + Number(r.amount), 0);

        return {
            repayments,
            totalPaid: Math.round(totalPaid * 100) / 100,
            count: repayments.length,
        };
    }

    // Get repayment history for a loan
    async findByLoan(loanApplicationId: string) {
        const repayments = await this.prisma.repayment.findMany({
            where: { loanApplicationId },
            include: {
                collectedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
            orderBy: { paidAt: 'desc' },
        });

        const totalPaid = repayments.reduce((sum, r) => sum + Number(r.amount), 0);

        return {
            repayments,
            totalPaid: Math.round(totalPaid * 100) / 100,
            count: repayments.length,
        };
    }

    /**
     * Portfolio at Risk (PAR) Report
     * Tracks overdue loans: PAR 30, PAR 60, PAR 90
     * Key metric for NBC and CMA in Cambodia
     */
    async getParReport() {
        const now = new Date();

        // Find all overdue schedules
        const overdueSchedules = await this.prisma.repaymentSchedule.findMany({
            where: {
                status: { in: ['PENDING', 'PARTIALLY_PAID'] },
                dueDate: { lt: now },
            },
            include: {
                loanApplication: {
                    select: {
                        id: true,
                        applicationNumber: true,
                        requestedAmount: true,
                        approvedAmount: true,
                        currency: true,
                        applicant: {
                            select: { id: true, firstName: true, lastName: true },
                        },
                    },
                },
            },
        });

        // Categorize by PAR bucket
        const par30: any[] = [];
        const par60: any[] = [];
        const par90: any[] = [];
        const parBelow30: any[] = [];

        const processedLoans = new Set<string>();

        for (const schedule of overdueSchedules) {
            const daysPastDue = Math.floor(
                (now.getTime() - new Date(schedule.dueDate).getTime()) / (1000 * 60 * 60 * 24),
            );

            if (processedLoans.has(schedule.loanApplicationId)) continue;
            processedLoans.add(schedule.loanApplicationId);

            const loanData = {
                loanApplicationId: schedule.loanApplicationId,
                applicationNumber: schedule.loanApplication.applicationNumber,
                applicant: schedule.loanApplication.applicant,
                outstandingAmount: Number(schedule.loanApplication.approvedAmount || schedule.loanApplication.requestedAmount),
                currency: schedule.loanApplication.currency,
                daysPastDue,
                overdueAmount: Number(schedule.remainingAmount),
            };

            if (daysPastDue >= 90) {
                par90.push(loanData);
            } else if (daysPastDue >= 60) {
                par60.push(loanData);
            } else if (daysPastDue >= 30) {
                par30.push(loanData);
            } else {
                parBelow30.push(loanData);
            }
        }

        // Get total portfolio value
        const totalPortfolio = await this.prisma.loanApplication.aggregate({
            where: { status: 'DISBURSED' },
            _sum: { approvedAmount: true },
            _count: { id: true },
        });

        const totalOutstanding = Number(totalPortfolio._sum.approvedAmount || 0);
        const totalLoans = totalPortfolio._count.id;

        const par30Amount = par30.reduce((sum, l) => sum + l.outstandingAmount, 0);
        const par60Amount = par60.reduce((sum, l) => sum + l.outstandingAmount, 0);
        const par90Amount = par90.reduce((sum, l) => sum + l.outstandingAmount, 0);

        // PAR 30+ includes all loans past due 30 days or more (includes 60 and 90)
        const par30PlusAmount = par30Amount + par60Amount + par90Amount;

        return {
            reportDate: now.toISOString(),
            portfolio: {
                totalOutstanding: Math.round(totalOutstanding * 100) / 100,
                totalActiveLoans: totalLoans,
            },
            par: {
                below30: {
                    count: parBelow30.length,
                    amount: parBelow30.reduce((sum, l) => sum + l.outstandingAmount, 0),
                    loans: parBelow30,
                },
                par30: {
                    count: par30.length,
                    amount: par30Amount,
                    ratio: totalOutstanding > 0 ? Math.round((par30PlusAmount / totalOutstanding) * 10000) / 100 : 0,
                    loans: par30,
                },
                par60: {
                    count: par60.length,
                    amount: par60Amount,
                    ratio: totalOutstanding > 0 ? Math.round(((par60Amount + par90Amount) / totalOutstanding) * 10000) / 100 : 0,
                    loans: par60,
                },
                par90: {
                    count: par90.length,
                    amount: par90Amount,
                    ratio: totalOutstanding > 0 ? Math.round((par90Amount / totalOutstanding) * 10000) / 100 : 0,
                    loans: par90,
                },
            },
            summary: {
                totalOverdueLoans: par30.length + par60.length + par90.length + parBelow30.length,
                par30PlusRate: totalOutstanding > 0
                    ? `${Math.round((par30PlusAmount / totalOutstanding) * 10000) / 100}%`
                    : '0%',
            },
        };
    }

    /**
     * Update overdue statuses for all pending schedules past due date
     */
    async updateOverdueStatuses() {
        const now = new Date();

        const result = await this.prisma.repaymentSchedule.updateMany({
            where: {
                status: { in: ['PENDING', 'PARTIALLY_PAID'] },
                dueDate: { lt: now },
            },
            data: {
                status: 'OVERDUE',
            },
        });

        return {
            message: `Updated ${result.count} overdue schedules`,
            count: result.count,
        };
    }
}
