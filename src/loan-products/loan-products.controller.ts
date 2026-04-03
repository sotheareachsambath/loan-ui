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
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoanProductsService } from './loan-products.service';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { UpdateLoanProductDto } from './dto/update-loan-product.dto';

@ApiBearerAuth()
@ApiTags('Loan Products')
@Controller('loan-products')
export class LoanProductsController {
    constructor(private readonly loanProductsService: LoanProductsService) { }

    @Post()
    @ApiOperation({ summary: 'Create loan product', description: 'Configure a new loan product with type, interest method, amount limits, and term settings.' })
    @ApiResponse({ status: 201, description: 'Loan product created successfully.' })
    @ApiResponse({ status: 400, description: 'Validation error — invalid fields or min > max values.' })
    @ApiResponse({ status: 409, description: 'Product code already exists.' })
    create(@Body() dto: CreateLoanProductDto) {
        return this.loanProductsService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List loan products', description: 'Retrieve all loan products with optional filters.' })
    @ApiQuery({ name: 'loanType', required: false, enum: ['PERSONAL', 'BUSINESS', 'AGRICULTURAL', 'GROUP_SOLIDARITY'] })
    @ApiQuery({ name: 'currency', required: false, enum: ['USD', 'KHR'] })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'List of loan products.' })
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
    @ApiResponse({ status: 200, description: 'Loan product details.' })
    @ApiResponse({ status: 404, description: 'Loan product not found.' })
    findOne(@Param('id') id: string) {
        return this.loanProductsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update loan product' })
    @ApiParam({ name: 'id', description: 'Loan Product UUID' })
    @ApiResponse({ status: 200, description: 'Loan product updated successfully.' })
    @ApiResponse({ status: 404, description: 'Loan product not found.' })
    @ApiResponse({ status: 400, description: 'Validation error.' })
    update(@Param('id') id: string, @Body() dto: UpdateLoanProductDto) {
        return this.loanProductsService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete loan product' })
    @ApiParam({ name: 'id', description: 'Loan Product UUID' })
    @ApiResponse({ status: 200, description: 'Loan product deleted successfully.' })
    @ApiResponse({ status: 404, description: 'Loan product not found.' })
    remove(@Param('id') id: string) {
        return this.loanProductsService.remove(id);
    }
}
