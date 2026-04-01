import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

enum RepaymentMethod {
    EMI = 'EMI',
    BALLOON = 'BALLOON',
}

export class GenerateScheduleDto {
    @IsString()
    @IsNotEmpty()
    loanApplicationId: string;

    @IsEnum(RepaymentMethod)
    @IsOptional()
    method?: RepaymentMethod = RepaymentMethod.EMI;
}
