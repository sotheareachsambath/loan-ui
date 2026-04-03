import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';

@Injectable()
export class DisbursementsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a disbursement (supports partial disbursement).
     * - Full disbursement: disburse the entire approved amount in one go
     * - Partial disbursement: disburse in multiple tranches
     */
    async create(dto: CreateDisbursementDto) {
        const loan = await this.prisma.loanApplication.findUnique({
            where: { id: dto.loanApplicationId },
            include: { disbursements: true },
        });

        if (!loan) {
            throw new NotFoundException('Loan application not found');
        }

        if (!['APPROVED', 'DISBURSED'].includes(loan.status)) {
            throw new BadRequestException('Loan must be APPROVED to disburse');
        }

        const approvedAmount = Number(loan.approvedAmount || loan.requestedAmount);

        // Calculate total already disbursed
        const totalDisbursed = loan.disbursements
            .filter((d) => d.status === 'COMPLETED')
            .reduce((sum, d) => sum + Number(d.amount), 0);

        const remainingToDiburse = approvedAmount - totalDisbursed;

        if (dto.amount > remainingToDiburse) {
            throw new BadRequestException(
                `Cannot disburse ${dto.amount}. Remaining disbursable amount: ${remainingToDiburse}`,
            );
        }

        // Validate bank transfer requires bank details
        if (dto.method === 'BANK_TRANSFER' && (!dto.bankName || !dto.accountNumber)) {
            throw new BadRequestException(
                'Bank name and account number are required for bank transfer disbursement',
            );
        }

        // Create disbursement
        const disbursement = await this.prisma.disbursement.create({
            data: {
                ...dto,
                status: 'COMPLETED',
                disbursedAt: new Date(),
            } as any,
        });

        // Update loan status to DISBURSED if not already
        if (loan.status === 'APPROVED') {
            await this.prisma.loanApplication.update({
                where: { id: dto.loanApplicationId },
                data: { status: 'DISBURSED' },
            });
        }

        return {
            disbursement,
            summary: {
                approvedAmount,
                totalDisbursed: totalDisbursed + dto.amount,
                remainingToDiburse: remainingToDiburse - dto.amount,
                isFullyDisbursed: totalDisbursed + dto.amount >= approvedAmount,
            },
        };
    }

    async findAll() {
        const disbursements = await this.prisma.disbursement.findMany({
            include: {
                disbursedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                loanApplication: {
                    select: { id: true, applicationNumber: true, approvedAmount: true, currency: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const totalDisbursed = disbursements
            .filter((d) => d.status === 'COMPLETED')
            .reduce((sum, d) => sum + Number(d.amount), 0);

        return {
            disbursements,
            totalDisbursed,
            count: disbursements.length,
        };
    }

    async findByLoan(loanApplicationId: string) {
        const disbursements = await this.prisma.disbursement.findMany({
            where: { loanApplicationId },
            include: {
                disbursedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const totalDisbursed = disbursements
            .filter((d) => d.status === 'COMPLETED')
            .reduce((sum, d) => sum + Number(d.amount), 0);

        return {
            disbursements,
            totalDisbursed,
            count: disbursements.length,
        };
    }

    async findOne(id: string) {
        const disbursement = await this.prisma.disbursement.findUnique({
            where: { id },
            include: {
                loanApplication: {
                    select: { id: true, applicationNumber: true, approvedAmount: true },
                },
                disbursedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        if (!disbursement) {
            throw new NotFoundException('Disbursement not found');
        }

        return disbursement;
    }

    async cancel(id: string) {
        const disbursement = await this.findOne(id);

        if (disbursement.status !== 'PENDING') {
            throw new BadRequestException('Can only cancel PENDING disbursements');
        }

        return this.prisma.disbursement.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
    }
}
