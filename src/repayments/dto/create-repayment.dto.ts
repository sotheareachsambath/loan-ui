import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum RepaymentType {
    REGULAR = 'REGULAR',
    EARLY_REPAYMENT = 'EARLY_REPAYMENT',
    PREPAYMENT = 'PREPAYMENT',
    PENALTY = 'PENALTY',
}

export class CreateRepaymentDto {
    @ApiProperty({ description: 'UUID of the loan application' })
    @IsString()
    @IsNotEmpty()
    loanApplicationId: string;

    @ApiProperty({ description: 'UUID of the staff collecting payment' })
    @IsString()
    @IsNotEmpty()
    collectedById: string;

    @ApiProperty({ example: 500, description: 'Payment amount' })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiPropertyOptional({ enum: RepaymentType, default: 'REGULAR' })
    @IsEnum(RepaymentType)
    @IsOptional()
    repaymentType?: RepaymentType;

    @ApiProperty({ example: 'CASH', description: 'CASH or BANK_TRANSFER' })
    @IsString()
    @IsNotEmpty()
    paymentMethod: string;

    @ApiPropertyOptional({ example: 'PAY-2026-001' })
    @IsString()
    @IsOptional()
    referenceNumber?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    notes?: string;
}
