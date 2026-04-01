import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

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
    @IsString()
    @IsNotEmpty()
    applicantId: string;

    @IsString()
    @IsNotEmpty()
    loanProductId: string;

    @IsNumber()
    @Min(1)
    requestedAmount: number;

    @IsNumber()
    @Min(0)
    interestRate: number;

    @IsNumber()
    @Min(1)
    termMonths: number;

    @IsEnum(RepaymentFrequency)
    @IsOptional()
    repaymentFrequency?: RepaymentFrequency;

    @IsEnum(Currency)
    @IsOptional()
    currency?: Currency;

    @IsString()
    @IsOptional()
    purpose?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    gracePeriodDays?: number;
}
