import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DisbursementsService } from './disbursements.service';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';

@ApiBearerAuth()
@ApiTags('Disbursements')
@Controller('disbursements')
export class DisbursementsController {
    constructor(private readonly disbursementsService: DisbursementsService) { }

    @Post()
    @ApiOperation({
        summary: 'Create disbursement',
        description: `Disburse loan funds via cash or bank transfer.

**Supports partial disbursement** — disburse in multiple tranches. The API tracks remaining disbursable amount automatically.

Bank transfer requires \`bankName\` and \`accountNumber\`.`,
    })
    @ApiResponse({ status: 201, description: 'Disbursement created successfully.' })
    @ApiResponse({ status: 400, description: 'Loan not approved, amount exceeds remaining disbursable, or missing bank details for BANK_TRANSFER.' })
    @ApiResponse({ status: 404, description: 'Loan application or disbursing user not found.' })
    create(@Body() dto: CreateDisbursementDto) {
        return this.disbursementsService.create(dto);
    }

    @Get('loan/:loanApplicationId')
    @ApiOperation({ summary: 'Get disbursements by loan', description: 'Returns all disbursements for a loan with total disbursed amount.' })
    @ApiParam({ name: 'loanApplicationId', description: 'Loan Application UUID' })
    @ApiResponse({ status: 200, description: 'List of disbursements with total disbursed summary.' })
    findByLoan(@Param('loanApplicationId') loanApplicationId: string) {
        return this.disbursementsService.findByLoan(loanApplicationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get disbursement by ID' })
    @ApiParam({ name: 'id', description: 'Disbursement UUID' })
    @ApiResponse({ status: 200, description: 'Disbursement details.' })
    @ApiResponse({ status: 404, description: 'Disbursement not found.' })
    findOne(@Param('id') id: string) {
        return this.disbursementsService.findOne(id);
    }

    @Patch(':id/cancel')
    @ApiOperation({ summary: 'Cancel disbursement', description: 'Only PENDING disbursements can be cancelled.' })
    @ApiParam({ name: 'id', description: 'Disbursement UUID' })
    @ApiResponse({ status: 200, description: 'Disbursement cancelled successfully.' })
    @ApiResponse({ status: 400, description: 'Disbursement is not in PENDING status.' })
    @ApiResponse({ status: 404, description: 'Disbursement not found.' })
    cancel(@Param('id') id: string) {
        return this.disbursementsService.cancel(id);
    }
}
