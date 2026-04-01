import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
} from '@nestjs/common';
import { RepaymentsService } from './repayments.service';
import { CreateRepaymentDto } from './dto/create-repayment.dto';

@Controller('repayments')
export class RepaymentsController {
    constructor(private readonly repaymentsService: RepaymentsService) { }

    // Record a payment
    @Post()
    create(@Body() dto: CreateRepaymentDto) {
        return this.repaymentsService.create(dto);
    }

    // Payment history for a loan
    @Get('loan/:loanApplicationId')
    findByLoan(@Param('loanApplicationId') loanApplicationId: string) {
        return this.repaymentsService.findByLoan(loanApplicationId);
    }

    // PAR Report (Portfolio at Risk)
    @Get('reports/par')
    getParReport() {
        return this.repaymentsService.getParReport();
    }

    // Batch update overdue statuses
    @Patch('overdue/update')
    updateOverdueStatuses() {
        return this.repaymentsService.updateOverdueStatuses();
    }
}
