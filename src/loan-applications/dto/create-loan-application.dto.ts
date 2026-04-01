import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum RepaymentFrequency {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
}

enum Currency {
    USD = 'USD',
    KHR = 'KHR',
}

export class CreateLoanApplicationDto {
    @ApiProperty({ description: 'UUID of the applicant (customer)' })
    @IsString()
    @IsNotEmpty()
    applicantId: string;

    @ApiProperty({ description: 'UUID of the loan product' })
    @IsString()
    @IsNotEmpty()
    loanProductId: string;

    @ApiProperty({ example: 5000, description: 'Requested loan amount' })
    @IsNumber()
    @Min(1)
    requestedAmount: number;

    @ApiProperty({ example: 2.0, description: 'Annual interest rate (%)' })
    @IsNumber()
    @Min(0)
    interestRate: number;

    @ApiProperty({ example: 12, description: 'Loan term in months' })
    @IsNumber()
    @Min(1)
    termMonths: number;

    @ApiPropertyOptional({ enum: RepaymentFrequency, default: 'MONTHLY' })
    @IsEnum(RepaymentFrequency)
    @IsOptional()
    repaymentFrequency?: RepaymentFrequency;

    @ApiPropertyOptional({ enum: Currency, default: 'USD' })
    @IsEnum(Currency)
    @IsOptional()
    currency?: Currency;

    @ApiPropertyOptional({ example: 'Working capital for small business' })
    @IsString()
    @IsOptional()
    purpose?: string;

    @ApiPropertyOptional({ example: 0 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    gracePeriodDays?: number;
}
