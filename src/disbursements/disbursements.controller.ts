import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { DisbursementsService } from './disbursements.service';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';

@ApiTags('Disbursements')
@Controller('disbursements')
export class DisbursementsController {
    constructor(private readonly disbursementsService: DisbursementsService) { }

    @Post()
    @ApiOperation({
        summary: 'Create disbursement',
        description: `Disburse loan funds via cash or bank transfer.

**Supports partial disbursement** — disburse in multiple tranches. The API tracks remaining disbursable amount automatically.

Bank transfer requires \`bankName\` and \`accountNumber\`.`,
    })
    create(@Body() dto: CreateDisbursementDto) {
        return this.disbursementsService.create(dto);
    }

    @Get('loan/:loanApplicationId')
    @ApiOperation({ summary: 'Get disbursements by loan', description: 'Returns all disbursements for a loan with total disbursed amount.' })
    @ApiParam({ name: 'loanApplicationId', description: 'Loan Application UUID' })
    findByLoan(@Param('loanApplicationId') loanApplicationId: string) {
        return this.disbursementsService.findByLoan(loanApplicationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get disbursement by ID' })
    @ApiParam({ name: 'id', description: 'Disbursement UUID' })
    findOne(@Param('id') id: string) {
        return this.disbursementsService.findOne(id);
    }

    @Patch(':id/cancel')
    @ApiOperation({ summary: 'Cancel disbursement', description: 'Only PENDING disbursements can be cancelled.' })
    @ApiParam({ name: 'id', description: 'Disbursement UUID' })
    cancel(@Param('id') id: string) {
        return this.disbursementsService.cancel(id);
    }
}
