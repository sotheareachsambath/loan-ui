import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum LoanType {
    PERSONAL = 'PERSONAL',
    BUSINESS = 'BUSINESS',
    AGRICULTURAL = 'AGRICULTURAL',
    GROUP_SOLIDARITY = 'GROUP_SOLIDARITY',
}

enum InterestRateMethod {
    FLAT_RATE = 'FLAT_RATE',
    DECLINING_BALANCE = 'DECLINING_BALANCE',
}

enum Currency {
    USD = 'USD',
    KHR = 'KHR',
}

export class CreateLoanProductDto {
    @ApiProperty({ example: 'Personal Micro Loan' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'PML-001' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ enum: LoanType, example: 'PERSONAL' })
    @IsEnum(LoanType)
    loanType: LoanType;

    @ApiPropertyOptional({ example: 'Short-term personal micro loan' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: InterestRateMethod, example: 'FLAT_RATE', description: 'Flat rate calculates interest on original principal; declining balance on remaining.' })
    @IsEnum(InterestRateMethod)
    interestRateMethod: InterestRateMethod;

    @ApiProperty({ example: 1.5, description: 'Minimum annual interest rate (%)' })
    @IsNumber()
    @Min(0)
    minInterestRate: number;

    @ApiProperty({ example: 3.0, description: 'Maximum annual interest rate (%)' })
    @IsNumber()
    @Min(0)
    maxInterestRate: number;

    @ApiProperty({ example: 100, description: 'Minimum loan amount' })
    @IsNumber()
    @Min(0)
    minAmount: number;

    @ApiProperty({ example: 10000, description: 'Maximum loan amount' })
    @IsNumber()
    @Min(0)
    maxAmount: number;

    @ApiPropertyOptional({ default: true, description: 'If true, loan has a fixed term with min/max months. If false, loan is open-ended (repay until fully paid).' })
    @IsBoolean()
    @IsOptional()
    hasFixedTerm?: boolean;

    @ApiPropertyOptional({ example: 1, description: 'Minimum term in months (required when hasFixedTerm is true)' })
    @IsNumber()
    @IsOptional()
    @Min(1)
    minTermMonths?: number;

    @ApiPropertyOptional({ example: 36, description: 'Maximum term in months (required when hasFixedTerm is true)' })
    @IsNumber()
    @IsOptional()
    @Min(1)
    maxTermMonths?: number;

    @ApiPropertyOptional({ enum: Currency, default: 'USD' })
    @IsEnum(Currency)
    @IsOptional()
    currency?: Currency;

    @ApiPropertyOptional({ example: 0, description: 'Grace period in days before first payment' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    gracePeriodDays?: number;

    @ApiPropertyOptional({ example: 0.5, description: 'Penalty rate (%) for overdue payments' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    penaltyRate?: number;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    requiresCollateral?: boolean;
}
