import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum DisbursementMethod {
    CASH = 'CASH',
    BANK_TRANSFER = 'BANK_TRANSFER',
}

export class CreateDisbursementDto {
    @ApiProperty({ description: 'UUID of the approved loan application' })
    @IsString()
    @IsNotEmpty()
    loanApplicationId: string;

    @ApiProperty({ description: 'UUID of the staff processing disbursement' })
    @IsString()
    @IsNotEmpty()
    disbursedById: string;

    @ApiProperty({ example: 5000, description: 'Amount to disburse (supports partial)' })
    @IsNumber()
    @Min(1)
    amount: number;

    @ApiProperty({ enum: DisbursementMethod, example: 'CASH' })
    @IsEnum(DisbursementMethod)
    method: DisbursementMethod;

    @ApiPropertyOptional({ example: 'ABA Bank', description: 'Required for BANK_TRANSFER' })
    @IsString()
    @IsOptional()
    bankName?: string;

    @ApiPropertyOptional({ example: '001234567', description: 'Required for BANK_TRANSFER' })
    @IsString()
    @IsOptional()
    accountNumber?: string;

    @ApiPropertyOptional({ example: 'REF-2026-001' })
    @IsString()
    @IsOptional()
    referenceNumber?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    notes?: string;
}
