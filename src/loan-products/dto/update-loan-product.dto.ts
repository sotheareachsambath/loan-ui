import { PartialType } from '@nestjs/swagger';
import { CreateLoanProductDto } from './create-loan-product.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLoanProductDto extends PartialType(CreateLoanProductDto) {
    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
