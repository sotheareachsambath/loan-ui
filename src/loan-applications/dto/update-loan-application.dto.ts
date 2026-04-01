import { PartialType } from '@nestjs/mapped-types';
import { CreateLoanApplicationDto } from './create-loan-application.dto';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateLoanApplicationDto extends PartialType(CreateLoanApplicationDto) {
    @IsString()
    @IsOptional()
    loanOfficerId?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    approvedAmount?: number;
}
