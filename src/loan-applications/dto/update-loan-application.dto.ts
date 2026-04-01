import { PartialType } from '@nestjs/swagger';
import { CreateLoanApplicationDto } from './create-loan-application.dto';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLoanApplicationDto extends PartialType(CreateLoanApplicationDto) {
    @ApiPropertyOptional({ description: 'UUID of the assigned loan officer' })
    @IsString()
    @IsOptional()
    loanOfficerId?: string;

    @ApiPropertyOptional({ description: 'Approved loan amount (set during approval)' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    approvedAmount?: number;
}
