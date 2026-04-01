import { Module } from '@nestjs/common';
import { RepaymentSchedulesService } from './repayment-schedules.service';
import { RepaymentSchedulesController } from './repayment-schedules.controller';

@Module({
    controllers: [RepaymentSchedulesController],
    providers: [RepaymentSchedulesService],
    exports: [RepaymentSchedulesService],
})
export class RepaymentSchedulesModule { }
