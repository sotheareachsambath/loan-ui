import { Module } from '@nestjs/common';
import { LoanApplicationsService } from './loan-applications.service';
import { LoanApplicationsController } from './loan-applications.controller';

@Module({
    controllers: [LoanApplicationsController],
    providers: [LoanApplicationsService],
    exports: [LoanApplicationsService],
})
export class LoanApplicationsModule { }
