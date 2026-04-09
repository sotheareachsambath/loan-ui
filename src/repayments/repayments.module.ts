import { Module } from '@nestjs/common';
import { RepaymentsService } from './repayments.service';
import { RepaymentsController } from './repayments.controller';
import { RepaymentSchedulesModule } from '../repayment-schedules/repayment-schedules.module';

@Module({
    imports: [RepaymentSchedulesModule],
    controllers: [RepaymentsController],
    providers: [RepaymentsService],
    exports: [RepaymentsService],
})
export class RepaymentsModule { }
