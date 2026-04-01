import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
} from '@nestjs/common';
import { LoanProductsService } from './loan-products.service';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { UpdateLoanProductDto } from './dto/update-loan-product.dto';

@Controller('loan-products')
export class LoanProductsController {
    constructor(private readonly loanProductsService: LoanProductsService) { }

    @Post()
    create(@Body() dto: CreateLoanProductDto) {
        return this.loanProductsService.create(dto);
    }

    @Get()
    findAll(
        @Query('loanType') loanType?: string,
        @Query('currency') currency?: string,
        @Query('isActive') isActive?: boolean,
    ) {
        return this.loanProductsService.findAll({ loanType, currency, isActive });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.loanProductsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateLoanProductDto) {
        return this.loanProductsService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.loanProductsService.remove(id);
    }
}
