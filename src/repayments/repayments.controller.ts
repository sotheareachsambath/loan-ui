import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RepaymentsService } from './repayments.service';
import { CreateRepaymentDto } from './dto/create-repayment.dto';

@ApiBearerAuth()
@ApiTags('Repayments & Collection')
@Controller('repayments')
export class RepaymentsController {
    constructor(private readonly repaymentsService: RepaymentsService) { }

    @Post()
    @ApiOperation({
        summary: 'Record a payment',
        description: `Record a loan repayment. Payment is automatically allocated to the earliest unpaid installments in order: **Penalty → Interest → Principal**.

Supports regular, early repayment, and prepayment types. Loan is automatically closed when all installments are fully paid.`,
    })
    @ApiResponse({ status: 201, description: 'Repayment recorded successfully. Returns payment allocation breakdown.' })
    @ApiResponse({ status: 400, description: 'Loan has no repayment schedule or all installments already paid.' })
    @ApiResponse({ status: 404, description: 'Loan application or collector not found.' })
    create(@Body() dto: CreateRepaymentDto) {
        return this.repaymentsService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all repayments', description: 'Returns all repayment records across all loans.' })
    @ApiResponse({ status: 200, description: 'List of all repayment records.' })
    findAll() {
        return this.repaymentsService.findAll();
    }

    @Get('loan/:loanApplicationId')
    @ApiOperation({ summary: 'Payment history for a loan', description: 'Returns all repayment records with collector details and total paid.' })
    @ApiParam({ name: 'loanApplicationId', description: 'Loan Application UUID' })
    @ApiResponse({ status: 200, description: 'List of repayment records with total paid summary.' })
    findByLoan(@Param('loanApplicationId') loanApplicationId: string) {
        return this.repaymentsService.findByLoan(loanApplicationId);
    }

    @Get('reports/par')
    @ApiOperation({
        summary: 'PAR Report (Portfolio at Risk)',
        description: `Generate Portfolio at Risk report — a key metric tracked by **NBC** and **CMA** in Cambodia.

**PAR Buckets:**
- **PAR 30** — Loans overdue 30-59 days
- **PAR 60** — Loans overdue 60-89 days
- **PAR 90** — Loans overdue 90+ days

Returns loan counts, amounts, and PAR ratios for each bucket.`,
    })
    @ApiResponse({ status: 200, description: 'PAR report with bucket breakdown and ratios.' })
    getParReport() {
        return this.repaymentsService.getParReport();
    }

    @Patch('overdue/update')
    @ApiOperation({ summary: 'Batch update overdue statuses', description: 'Marks all past-due PENDING/PARTIALLY_PAID installments as OVERDUE.' })
    @ApiResponse({ status: 200, description: 'Overdue statuses updated. Returns count of affected installments.' })
    updateOverdueStatuses() {
        return this.repaymentsService.updateOverdueStatuses();
    }
}
