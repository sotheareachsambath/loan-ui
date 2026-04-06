import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { S3Module } from './s3/s3.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LoanProductsModule } from './loan-products/loan-products.module';
import { LoanApplicationsModule } from './loan-applications/loan-applications.module';
import { RepaymentSchedulesModule } from './repayment-schedules/repayment-schedules.module';
import { DisbursementsModule } from './disbursements/disbursements.module';
import { RepaymentsModule } from './repayments/repayments.module';
import { AssetsModule } from './assets/assets.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    PrismaModule,
    S3Module,
    AuthModule,
    UsersModule,
    LoanProductsModule,
    LoanApplicationsModule,
    RepaymentSchedulesModule,
    DisbursementsModule,
    RepaymentsModule,
    AssetsModule,
  ],
  controllers: [AppController],
})
export class AppModule { }
