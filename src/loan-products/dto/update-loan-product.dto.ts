import { PartialType } from '@nestjs/mapped-types';
import { CreateLoanProductDto } from './create-loan-product.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateLoanProductDto extends PartialType(CreateLoanProductDto) {
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
