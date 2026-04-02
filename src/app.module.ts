import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { LoanProductsModule } from './loan-products/loan-products.module';
import { LoanApplicationsModule } from './loan-applications/loan-applications.module';
import { RepaymentSchedulesModule } from './repayment-schedules/repayment-schedules.module';
import { DisbursementsModule } from './disbursements/disbursements.module';
import { RepaymentsModule } from './repayments/repayments.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    LoanProductsModule,
    LoanApplicationsModule,
    RepaymentSchedulesModule,
    DisbursementsModule,
    RepaymentsModule,
  ],
  controllers: [AppController],
})
export class AppModule { }
