import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum RepaymentMethod {
    EMI = 'EMI',
    BALLOON = 'BALLOON',
}

export class GenerateScheduleDto {
    @ApiProperty({ description: 'UUID of the approved loan application' })
    @IsString()
    @IsNotEmpty()
    loanApplicationId: string;

    @ApiPropertyOptional({ enum: RepaymentMethod, default: 'EMI', description: 'EMI = equal installments, BALLOON = interest-only + lump sum at end' })
    @IsEnum(RepaymentMethod)
    @IsOptional()
    method?: RepaymentMethod = RepaymentMethod.EMI;
}
