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
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { LoanProductsService } from './loan-products.service';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { UpdateLoanProductDto } from './dto/update-loan-product.dto';

@ApiTags('Loan Products')
@Controller('loan-products')
export class LoanProductsController {
    constructor(private readonly loanProductsService: LoanProductsService) { }

    @Post()
    @ApiOperation({ summary: 'Create loan product', description: 'Configure a new loan product with type, interest method, amount limits, and term settings.' })
    create(@Body() dto: CreateLoanProductDto) {
        return this.loanProductsService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List loan products', description: 'Retrieve all loan products with optional filters.' })
    @ApiQuery({ name: 'loanType', required: false, enum: ['PERSONAL', 'BUSINESS', 'AGRICULTURAL', 'GROUP_SOLIDARITY'] })
    @ApiQuery({ name: 'currency', required: false, enum: ['USD', 'KHR'] })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    findAll(
        @Query('loanType') loanType?: string,
        @Query('currency') currency?: string,
        @Query('isActive') isActive?: boolean,
    ) {
        return this.loanProductsService.findAll({ loanType, currency, isActive });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get loan product by ID' })
    @ApiParam({ name: 'id', description: 'Loan Product UUID' })
    findOne(@Param('id') id: string) {
        return this.loanProductsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update loan product' })
    @ApiParam({ name: 'id', description: 'Loan Product UUID' })
    update(@Param('id') id: string, @Body() dto: UpdateLoanProductDto) {
        return this.loanProductsService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete loan product' })
    @ApiParam({ name: 'id', description: 'Loan Product UUID' })
    remove(@Param('id') id: string) {
        return this.loanProductsService.remove(id);
    }
}
