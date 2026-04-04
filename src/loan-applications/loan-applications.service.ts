import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { UpdateLoanApplicationDto } from './dto/update-loan-application.dto';
import { ApprovalActionDto } from './dto/approval-action.dto';

@Injectable()
export class LoanApplicationsService {
    constructor(private prisma: PrismaService) { }

    // Generate unique application number
    private generateApplicationNumber(): string {
        const date = new Date();
        const prefix = 'LN';
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}${year}${month}-${random}`;
    }

    async create(dto: CreateLoanApplicationDto) {
        // Validate applicant exists
        const applicant = await this.prisma.user.findUnique({
            where: { id: dto.applicantId },
        });
        if (!applicant) {
            throw new NotFoundException('Applicant not found');
        }

        // Validate loan product exists and is active
        const product = await this.prisma.loanProduct.findUnique({
            where: { id: dto.loanProductId },
        });
        if (!product) {
            throw new NotFoundException('Loan product not found');
        }
        if (!product.isActive) {
            throw new BadRequestException('Loan product is not active');
        }

        // Validate requested amount within product limits
        if (dto.requestedAmount < Number(product.minAmount) || dto.requestedAmount > Number(product.maxAmount)) {
            throw new BadRequestException(
                `Requested amount must be between ${product.minAmount} and ${product.maxAmount} ${product.currency}`,
            );
        }

        // Validate term within product limits (only for fixed-term products)
        //@ts-ignore
        if (product.hasFixedTerm) {
            if (!dto.termMonths || (product.minTermMonths !== null && dto.termMonths < product.minTermMonths) || (product.maxTermMonths !== null && dto.termMonths > product.maxTermMonths)) {
                throw new BadRequestException(
                    `Loan term must be between ${product.minTermMonths} and ${product.maxTermMonths} months`,
                );
            }
        }

        // Validate interest rate within product limits
        if (dto.interestRate < Number(product.minInterestRate) || dto.interestRate > Number(product.maxInterestRate)) {
            throw new BadRequestException(
                `Interest rate must be between ${product.minInterestRate}% and ${product.maxInterestRate}%`,
            );
        }

        return this.prisma.loanApplication.create({
            data: {
                applicationNumber: this.generateApplicationNumber(),
                ...dto,
                currency: dto.currency || product.currency,
                gracePeriodDays: dto.gracePeriodDays ?? product.gracePeriodDays,
            } as any,
            include: {
                applicant: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                loanProduct: true,
            },
        });
    }

    async findAll(query?: {
        status?: string;
        loanOfficerId?: string;
        applicantId?: string;
        page?: number;
        limit?: number;
    }) {
        const page = query?.page || 1;
        const limit = query?.limit || 10;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (query?.status) where.status = query.status;
        if (query?.loanOfficerId) where.loanOfficerId = query.loanOfficerId;
        if (query?.applicantId) where.applicantId = query.applicantId;

        const [applications, total] = await Promise.all([
            this.prisma.loanApplication.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    applicant: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    loanProduct: {
                        select: { id: true, name: true, code: true, loanType: true },
                    },
                    loanOfficer: {
                        select: { id: true, firstName: true, lastName: true },
                    },
                    _count: {
                        select: { documents: true, approvalWorkflows: true },
                    },
                },
            }),
            this.prisma.loanApplication.count({ where }),
        ]);

        return {
            data: applications,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findOne(id: string) {
        const application = await this.prisma.loanApplication.findUnique({
            where: { id },
            include: {
                applicant: {
                    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
                },
                loanProduct: true,
                loanOfficer: {
                    select: { id: true, firstName: true, lastName: true },
                },
                documents: true,
                approvalWorkflows: {
                    include: {
                        approver: {
                            select: { id: true, firstName: true, lastName: true, role: true },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                repaymentSchedules: { orderBy: { installmentNumber: 'asc' } },
                disbursements: true,
                repayments: { orderBy: { paidAt: 'desc' } },
            },
        });

        if (!application) {
            throw new NotFoundException('Loan application not found');
        }

        return application;
    }

    async update(id: string, dto: UpdateLoanApplicationDto) {
        const application = await this.findOne(id);

        if (!['DRAFT', 'SUBMITTED'].includes(application.status)) {
            throw new BadRequestException('Can only update applications in DRAFT or SUBMITTED status');
        }

        return this.prisma.loanApplication.update({
            where: { id },
            data: dto as any,
            include: {
                applicant: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                loanProduct: true,
            },
        });
    }

    // Submit application for review
    async submit(id: string) {
        const application = await this.findOne(id);

        if (application.status !== 'DRAFT') {
            throw new BadRequestException('Only DRAFT applications can be submitted');
        }

        return this.prisma.loanApplication.update({
            where: { id },
            data: {
                status: 'SUBMITTED',
                submittedAt: new Date(),
            },
        });
    }

    // Assign loan officer
    async assignOfficer(id: string, loanOfficerId: string) {
        const application = await this.findOne(id);

        if (application.status !== 'SUBMITTED') {
            throw new BadRequestException('Can only assign officer to SUBMITTED applications');
        }

        // Verify the user is a LOAN_OFFICER
        const officer = await this.prisma.user.findUnique({
            where: { id: loanOfficerId },
        });

        if (!officer || officer.role !== 'LOAN_OFFICER') {
            throw new BadRequestException('User is not a loan officer');
        }

        return this.prisma.loanApplication.update({
            where: { id },
            data: {
                loanOfficerId,
                status: 'UNDER_REVIEW',
            },
        });
    }

    // Multi-level approval workflow: OFFICER → MANAGER → DIRECTOR
    async processApproval(id: string, dto: ApprovalActionDto) {
        const application = await this.findOne(id);

        // Verify approver exists and has correct role
        const approver = await this.prisma.user.findUnique({
            where: { id: dto.approverId },
        });

        if (!approver) {
            throw new NotFoundException('Approver not found');
        }

        // Validate approval level matches user role
        const roleToLevel: Record<string, string> = {
            LOAN_OFFICER: 'OFFICER',
            MANAGER: 'MANAGER',
            DIRECTOR: 'DIRECTOR',
        };

        if (roleToLevel[approver.role] !== dto.level) {
            throw new ForbiddenException(
                `User role ${approver.role} cannot approve at ${dto.level} level`,
            );
        }

        // Validate approval flow sequence
        const validTransitions: Record<string, string[]> = {
            UNDER_REVIEW: ['OFFICER'],
            OFFICER_APPROVED: ['MANAGER'],
            MANAGER_APPROVED: ['DIRECTOR'],
        };

        const allowedLevels = validTransitions[application.status];
        if (!allowedLevels || !allowedLevels.includes(dto.level)) {
            throw new BadRequestException(
                `Cannot process ${dto.level} approval for application in ${application.status} status`,
            );
        }

        // Determine new status based on action and level
        let newStatus: string;

        if (dto.action === 'REJECTED') {
            newStatus = 'REJECTED';
        } else if (dto.action === 'RETURNED') {
            newStatus = 'UNDER_REVIEW';
        } else {
            // APPROVED
            const statusMap: Record<string, string> = {
                OFFICER: 'OFFICER_APPROVED',
                MANAGER: 'MANAGER_APPROVED',
                DIRECTOR: 'APPROVED',
            };
            newStatus = statusMap[dto.level];
        }

        // Create approval record and update application status
        const [workflow, updatedApp] = await this.prisma.$transaction([
            this.prisma.approvalWorkflow.create({
                data: {
                    loanApplicationId: id,
                    approverId: dto.approverId,
                    level: dto.level as any,
                    action: dto.action as any,
                    comments: dto.comments,
                },
            }),
            this.prisma.loanApplication.update({
                where: { id },
                data: {
                    status: newStatus as any,
                    ...(newStatus === 'APPROVED' ? { approvedAt: new Date(), approvedAmount: application.requestedAmount } : {}),
                    ...(newStatus === 'REJECTED' ? { rejectedAt: new Date(), rejectionReason: dto.comments } : {}),
                },
            }),
        ]);

        return { workflow, application: updatedApp };
    }

    // Get approval history
    async getApprovalHistory(id: string) {
        return this.prisma.approvalWorkflow.findMany({
            where: { loanApplicationId: id },
            include: {
                approver: {
                    select: { id: true, firstName: true, lastName: true, role: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async remove(id: string) {
        const application = await this.findOne(id);
        if (application.status !== 'DRAFT') {
            throw new BadRequestException('Can only delete DRAFT applications');
        }
        await this.prisma.loanApplication.delete({ where: { id } });
        return { message: 'Loan application deleted successfully' };
    }
}
