import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { UpdateLoanProductDto } from './dto/update-loan-product.dto';

@Injectable()
export class LoanProductsService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateLoanProductDto) {
        const existing = await this.prisma.loanProduct.findUnique({
            where: { code: dto.code },
        });

        if (existing) {
            throw new ConflictException(`Loan product with code "${dto.code}" already exists`);
        }

        if (dto.minAmount > dto.maxAmount) {
            throw new ConflictException('minAmount cannot be greater than maxAmount');
        }

        if (dto.minTermMonths > dto.maxTermMonths) {
            throw new ConflictException('minTermMonths cannot be greater than maxTermMonths');
        }

        if (dto.minInterestRate > dto.maxInterestRate) {
            throw new ConflictException('minInterestRate cannot be greater than maxInterestRate');
        }

        return this.prisma.loanProduct.create({ data: dto as any });
    }

    async findAll(query?: { loanType?: string; currency?: string; isActive?: boolean }) {
        const where: any = {};
        if (query?.loanType) where.loanType = query.loanType;
        if (query?.currency) where.currency = query.currency;
        if (query?.isActive !== undefined) where.isActive = query.isActive;

        return this.prisma.loanProduct.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const product = await this.prisma.loanProduct.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException('Loan product not found');
        }

        return product;
    }

    async update(id: string, dto: UpdateLoanProductDto) {
        await this.findOne(id);
        return this.prisma.loanProduct.update({
            where: { id },
            data: dto as any,
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        await this.prisma.loanProduct.delete({ where: { id } });
        return { message: 'Loan product deleted successfully' };
    }
}
