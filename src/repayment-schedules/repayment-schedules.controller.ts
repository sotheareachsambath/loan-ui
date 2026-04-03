import {
    Controller,
    Get,
    Post,
    Body,
    Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RepaymentSchedulesService } from './repayment-schedules.service';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';

@ApiBearerAuth()
@ApiTags('Repayment Schedules')
@Controller('repayment-schedules')
export class RepaymentSchedulesController {
    constructor(
        private readonly repaymentSchedulesService: RepaymentSchedulesService,
    ) { }

    @Post('generate')
    @ApiOperation({
        summary: 'Generate repayment schedule',
        description: `Generate installment schedule for an approved loan.

**Methods:**
- **EMI** — Equal Monthly Installment (principal + interest spread equally)
- **BALLOON** — Interest-only payments during term, full principal at end

**Interest Calculation:**
- **Flat Rate** — Interest on original principal (common in Cambodia)
- **Declining Balance** — Interest on remaining principal

Supports daily, weekly, and monthly frequencies with grace period.`,
    })
    @ApiResponse({ status: 201, description: 'Repayment schedule generated successfully.' })
    @ApiResponse({ status: 400, description: 'Loan is not in APPROVED or DISBURSED status, or schedule already exists.' })
    @ApiResponse({ status: 404, description: 'Loan application not found.' })
    generate(@Body() dto: GenerateScheduleDto) {
        return this.repaymentSchedulesService.generateSchedule(
            dto.loanApplicationId,
            dto.method || 'EMI',
        );
    }

    @Get('loan/:loanApplicationId')
    @ApiOperation({ summary: 'Get repayment schedule', description: 'Returns all installments for a loan with summary totals.' })
    @ApiParam({ name: 'loanApplicationId', description: 'Loan Application UUID' })
    @ApiResponse({ status: 200, description: 'Repayment schedule with installment breakdown and summary.' })
    @ApiResponse({ status: 404, description: 'Loan application not found or no schedule generated.' })
    findByLoan(@Param('loanApplicationId') loanApplicationId: string) {
        return this.repaymentSchedulesService.findByLoan(loanApplicationId);
    }
}
