import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

enum RepaymentType {
    REGULAR = 'REGULAR',
    EARLY_REPAYMENT = 'EARLY_REPAYMENT',
    PREPAYMENT = 'PREPAYMENT',
    PENALTY = 'PENALTY',
}

export class CreateRepaymentDto {
    @IsString()
    @IsNotEmpty()
    loanApplicationId: string;

    @IsString()
    @IsNotEmpty()
    collectedById: string;

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsEnum(RepaymentType)
    @IsOptional()
    repaymentType?: RepaymentType;

    @IsString()
    @IsNotEmpty()
    paymentMethod: string; // CASH, BANK_TRANSFER

    @IsString()
    @IsOptional()
    referenceNumber?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
