import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { RepaymentsService } from './repayments.service';
import { CreateRepaymentDto } from './dto/create-repayment.dto';

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
    create(@Body() dto: CreateRepaymentDto) {
        return this.repaymentsService.create(dto);
    }

    @Get('loan/:loanApplicationId')
    @ApiOperation({ summary: 'Payment history for a loan', description: 'Returns all repayment records with collector details and total paid.' })
    @ApiParam({ name: 'loanApplicationId', description: 'Loan Application UUID' })
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
    getParReport() {
        return this.repaymentsService.getParReport();
    }

    @Patch('overdue/update')
    @ApiOperation({ summary: 'Batch update overdue statuses', description: 'Marks all past-due PENDING/PARTIALLY_PAID installments as OVERDUE.' })
    updateOverdueStatuses() {
        return this.repaymentsService.updateOverdueStatuses();
    }
}
