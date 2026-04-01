import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
} from '@nestjs/common';
import { DisbursementsService } from './disbursements.service';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';

@Controller('disbursements')
export class DisbursementsController {
    constructor(private readonly disbursementsService: DisbursementsService) { }

    @Post()
    create(@Body() dto: CreateDisbursementDto) {
        return this.disbursementsService.create(dto);
    }

    @Get('loan/:loanApplicationId')
    findByLoan(@Param('loanApplicationId') loanApplicationId: string) {
        return this.disbursementsService.findByLoan(loanApplicationId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.disbursementsService.findOne(id);
    }

    @Patch(':id/cancel')
    cancel(@Param('id') id: string) {
        return this.disbursementsService.cancel(id);
    }
}
