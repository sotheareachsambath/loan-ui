import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

enum DisbursementMethod {
    CASH = 'CASH',
    BANK_TRANSFER = 'BANK_TRANSFER',
}

export class CreateDisbursementDto {
    @IsString()
    @IsNotEmpty()
    loanApplicationId: string;

    @IsString()
    @IsNotEmpty()
    disbursedById: string;

    @IsNumber()
    @Min(1)
    amount: number;

    @IsEnum(DisbursementMethod)
    method: DisbursementMethod;

    @IsString()
    @IsOptional()
    bankName?: string;

    @IsString()
    @IsOptional()
    accountNumber?: string;

    @IsString()
    @IsOptional()
    referenceNumber?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
