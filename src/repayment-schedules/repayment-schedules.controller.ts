import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { RepaymentSchedulesService } from './repayment-schedules.service';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';

@Controller('repayment-schedules')
export class RepaymentSchedulesController {
    constructor(
        private readonly repaymentSchedulesService: RepaymentSchedulesService,
    ) { }

    // Generate repayment schedule for an approved loan
    @Post('generate')
    generate(@Body() dto: GenerateScheduleDto) {
        return this.repaymentSchedulesService.generateSchedule(
            dto.loanApplicationId,
            dto.method || 'EMI',
        );
    }

    // Get schedule by loan application ID
    @Get('loan/:loanApplicationId')
    findByLoan(@Param('loanApplicationId') loanApplicationId: string) {
        return this.repaymentSchedulesService.findByLoan(loanApplicationId);
    }
}
