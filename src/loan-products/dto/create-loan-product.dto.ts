import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

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
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    code: string;

    @IsEnum(LoanType)
    loanType: LoanType;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(InterestRateMethod)
    interestRateMethod: InterestRateMethod;

    @IsNumber()
    @Min(0)
    minInterestRate: number;

    @IsNumber()
    @Min(0)
    maxInterestRate: number;

    @IsNumber()
    @Min(0)
    minAmount: number;

    @IsNumber()
    @Min(0)
    maxAmount: number;

    @IsNumber()
    @Min(1)
    minTermMonths: number;

    @IsNumber()
    @Min(1)
    maxTermMonths: number;

    @IsEnum(Currency)
    @IsOptional()
    currency?: Currency;

    @IsNumber()
    @IsOptional()
    @Min(0)
    gracePeriodDays?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    penaltyRate?: number;

    @IsBoolean()
    @IsOptional()
    requiresCollateral?: boolean;
}
