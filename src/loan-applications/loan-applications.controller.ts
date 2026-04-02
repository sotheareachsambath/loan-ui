import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseInterceptors,
    UploadedFiles,
    BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import {
    ApiTags,
    ApiOperation,
    ApiQuery,
    ApiParam,
    ApiConsumes,
    ApiBody,
} from '@nestjs/swagger';
import { LoanApplicationsService } from './loan-applications.service';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { UpdateLoanApplicationDto } from './dto/update-loan-application.dto';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Loan Applications')
@Controller('loan-applications')
export class LoanApplicationsController {
    constructor(
        private readonly loanApplicationsService: LoanApplicationsService,
        private readonly prisma: PrismaService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create loan application', description: 'Submit a new loan request. Validates against loan product limits (amount, term, rate).' })
    create(@Body() dto: CreateLoanApplicationDto) {
        return this.loanApplicationsService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List loan applications', description: 'Paginated list with filters by status, officer, and applicant.' })
    @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'OFFICER_APPROVED', 'MANAGER_APPROVED', 'DIRECTOR_APPROVED', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED'] })
    @ApiQuery({ name: 'loanOfficerId', required: false })
    @ApiQuery({ name: 'applicantId', required: false })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAll(
        @Query('status') status?: string,
        @Query('loanOfficerId') loanOfficerId?: string,
        @Query('applicantId') applicantId?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.loanApplicationsService.findAll({
            status,
            loanOfficerId,
            applicantId,
            page,
            limit,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get loan application details', description: 'Returns full application with applicant, product, officer, documents, approval history, schedules, disbursements, and repayments.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    findOne(@Param('id') id: string) {
        return this.loanApplicationsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update loan application', description: 'Only DRAFT or SUBMITTED applications can be updated.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    update(@Param('id') id: string, @Body() dto: UpdateLoanApplicationDto) {
        return this.loanApplicationsService.update(id, dto);
    }

    @Post(':id/submit')
    @ApiOperation({ summary: 'Submit application for review', description: 'Changes status from DRAFT → SUBMITTED.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    submit(@Param('id') id: string) {
        return this.loanApplicationsService.submit(id);
    }

    @Post(':id/assign-officer')
    @ApiOperation({ summary: 'Assign loan officer', description: 'Assign a LOAN_OFFICER to review the application. Changes status to UNDER_REVIEW.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    @ApiBody({ schema: { type: 'object', properties: { loanOfficerId: { type: 'string', description: 'UUID of the loan officer' } }, required: ['loanOfficerId'] } })
    assignOfficer(
        @Param('id') id: string,
        @Body('loanOfficerId') loanOfficerId: string,
    ) {
        return this.loanApplicationsService.assignOfficer(id, loanOfficerId);
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Process approval action',
        description: `Multi-level approval workflow:
- **OFFICER** level: UNDER_REVIEW → OFFICER_APPROVED
- **MANAGER** level: OFFICER_APPROVED → MANAGER_APPROVED  
- **DIRECTOR** level: MANAGER_APPROVED → APPROVED

Actions: APPROVED, REJECTED, RETURNED`,
    })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    processApproval(@Param('id') id: string, @Body() dto: ApprovalActionDto) {
        return this.loanApplicationsService.processApproval(id, dto);
    }

    @Get(':id/approval-history')
    @ApiOperation({ summary: 'Get approval history', description: 'Returns all approval actions with approver details, ordered chronologically.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    getApprovalHistory(@Param('id') id: string) {
        return this.loanApplicationsService.getApprovalHistory(id);
    }

    @Post(':id/documents')
    @ApiOperation({ summary: 'Upload documents', description: 'Upload documents (ID, collateral, income proof). Max 10 files, 10MB each. Accepts: JPEG, PNG, GIF, PDF, DOC, DOCX.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: { type: 'array', items: { type: 'string', format: 'binary' } },
                documentType: { type: 'string', enum: ['ID', 'COLLATERAL', 'INCOME_PROOF', 'OTHER'], description: 'Type of document' },
            },
        },
    })
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            storage: diskStorage({
                destination: './uploads/documents',
                filename: (req, file, cb) => {
                    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
                    cb(null, uniqueName);
                },
            }),
            limits: { fileSize: 10 * 1024 * 1024 },
            fileFilter: (req, file, cb) => {
                const allowedMimes = [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                ];
                if (allowedMimes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new BadRequestException('Invalid file type'), false);
                }
            },
        }),
    )
    async uploadDocuments(
        @Param('id') id: string,
        @UploadedFiles() files: Express.Multer.File[],
        @Body('documentType') documentType: string,
    ) {
        await this.loanApplicationsService.findOne(id);

        if (!files || files.length === 0) {
            throw new BadRequestException('No files uploaded');
        }

        const documents = await Promise.all(
            files.map((file) =>
                this.prisma.document.create({
                    data: {
                        loanApplicationId: id,
                        fileName: file.filename,
                        originalName: file.originalname,
                        filePath: file.path,
                        fileSize: file.size,
                        mimeType: file.mimetype,
                        documentType: documentType || 'OTHER',
                    },
                }),
            ),
        );

        return documents;
    }

    @Get(':id/documents')
    @ApiOperation({ summary: 'List documents', description: 'Get all uploaded documents for a loan application.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    async getDocuments(@Param('id') id: string) {
        return this.prisma.document.findMany({
            where: { loanApplicationId: id },
            orderBy: { createdAt: 'desc' },
        });
    }

    @Delete(':id/documents/:documentId')
    @ApiOperation({ summary: 'Delete a document' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    @ApiParam({ name: 'documentId', description: 'Document UUID' })
    async deleteDocument(
        @Param('id') id: string,
        @Param('documentId') documentId: string,
    ) {
        await this.prisma.document.delete({ where: { id: documentId } });
        return { message: 'Document deleted successfully' };
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete loan application', description: 'Only DRAFT applications can be deleted.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    remove(@Param('id') id: string) {
        return this.loanApplicationsService.remove(id);
    }
}
