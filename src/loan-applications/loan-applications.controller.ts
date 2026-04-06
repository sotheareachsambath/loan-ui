import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiQuery,
    ApiParam,
    ApiBody,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { LoanApplicationsService } from './loan-applications.service';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { UpdateLoanApplicationDto } from './dto/update-loan-application.dto';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

@ApiBearerAuth()
@ApiTags('Loan Applications')
@Controller('loan-applications')
export class LoanApplicationsController {
    constructor(
        private readonly loanApplicationsService: LoanApplicationsService,
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create loan application', description: 'Submit a new loan request. Validates against loan product limits (amount, term, rate).' })
    @ApiResponse({ status: 201, description: 'Loan application created successfully.' })
    @ApiResponse({ status: 400, description: 'Validation error — amount/term/rate outside product limits.' })
    @ApiResponse({ status: 404, description: 'Applicant or loan product not found.' })
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
    @ApiResponse({ status: 200, description: 'Paginated list of loan applications.' })
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
    @ApiResponse({ status: 200, description: 'Full loan application details with all relations.' })
    @ApiResponse({ status: 404, description: 'Loan application not found.' })
    findOne(@Param('id') id: string) {
        return this.loanApplicationsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update loan application', description: 'Only DRAFT or SUBMITTED applications can be updated.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    @ApiResponse({ status: 200, description: 'Loan application updated successfully.' })
    @ApiResponse({ status: 400, description: 'Cannot update — application is not in DRAFT or SUBMITTED status.' })
    @ApiResponse({ status: 404, description: 'Loan application not found.' })
    update(@Param('id') id: string, @Body() dto: UpdateLoanApplicationDto) {
        return this.loanApplicationsService.update(id, dto);
    }

    @Post(':id/submit')
    @ApiOperation({ summary: 'Submit application for review', description: 'Changes status from DRAFT → SUBMITTED.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    @ApiResponse({ status: 200, description: 'Application submitted successfully.' })
    @ApiResponse({ status: 400, description: 'Application is not in DRAFT status.' })
    @ApiResponse({ status: 404, description: 'Loan application not found.' })
    submit(@Param('id') id: string) {
        return this.loanApplicationsService.submit(id);
    }

    @Post(':id/assign-officer')
    @ApiOperation({ summary: 'Assign loan officer', description: 'Assign a LOAN_OFFICER to review the application. Changes status to UNDER_REVIEW.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    @ApiBody({ schema: { type: 'object', properties: { loanOfficerId: { type: 'string', description: 'UUID of the loan officer' } }, required: ['loanOfficerId'] } })
    @ApiResponse({ status: 200, description: 'Loan officer assigned successfully.' })
    @ApiResponse({ status: 400, description: 'Application is not in SUBMITTED status or user is not a LOAN_OFFICER.' })
    @ApiResponse({ status: 404, description: 'Loan application or officer not found.' })
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
    @ApiResponse({ status: 200, description: 'Approval action processed successfully.' })
    @ApiResponse({ status: 400, description: 'Invalid approval level for current status, or invalid action.' })
    @ApiResponse({ status: 404, description: 'Loan application or approver not found.' })
    processApproval(@Param('id') id: string, @Body() dto: ApprovalActionDto) {
        return this.loanApplicationsService.processApproval(id, dto);
    }

    @Get(':id/approval-history')
    @ApiOperation({ summary: 'Get approval history', description: 'Returns all approval actions with approver details, ordered chronologically.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    @ApiResponse({ status: 200, description: 'List of approval workflow records.' })
    @ApiResponse({ status: 404, description: 'Loan application not found.' })
    getApprovalHistory(@Param('id') id: string) {
        return this.loanApplicationsService.getApprovalHistory(id);
    }

    @Post(':id/documents')
    @ApiOperation({ summary: 'Save document URL', description: 'Store a document reference for a loan application. Upload the file separately first, then pass the resulting URL here.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    @ApiBody({ type: CreateDocumentDto })
    @ApiResponse({ status: 201, description: 'Document reference saved successfully.' })
    @ApiResponse({ status: 400, description: 'Invalid document payload.' })
    @ApiResponse({ status: 404, description: 'Loan application not found.' })
    async createDocument(
        @Param('id') id: string,
        @Body() dto: CreateDocumentDto,
    ) {
        await this.loanApplicationsService.findOne(id);

        if (!dto.filePath) {
            throw new BadRequestException('filePath is required');
        }

        return this.prisma.document.create({
            data: {
                loanApplicationId: id,
                fileName: dto.fileName || dto.originalName || dto.filePath,
                originalName: dto.originalName || dto.fileName || dto.filePath,
                filePath: dto.filePath,
                fileSize: dto.fileSize ?? 0,
                mimeType: dto.mimeType || 'application/octet-stream',
                documentType: dto.documentType || 'OTHER',
            },
        });
    }

    @Get(':id/documents')
    @ApiOperation({ summary: 'List documents', description: 'Get all stored document references for a loan application.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    @ApiResponse({ status: 200, description: 'List of documents for the loan application.' })
    async getDocuments(@Param('id') id: string) {
        const documents = await this.prisma.document.findMany({
            where: { loanApplicationId: id },
            orderBy: { createdAt: 'desc' },
        });

        return Promise.all(
            documents.map(async (doc) => ({
                ...doc,
                url: doc.filePath.startsWith('http')
                    ? doc.filePath
                    : await this.s3.getSignedUrl(this.s3.normalizeKey(doc.filePath)),
            })),
        );
    }

    @Get(':id/documents/:documentId/signed-url')
    @ApiOperation({ summary: 'Get document URL', description: 'Returns the stored document URL for a loan application document.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    @ApiParam({ name: 'documentId', description: 'Document UUID' })
    @ApiResponse({ status: 200, description: 'Document URL.' })
    @ApiResponse({ status: 404, description: 'Document not found.' })
    async getSignedUrl(
        @Param('id') id: string,
        @Param('documentId') documentId: string,
    ) {
        const doc = await this.prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!doc) {
            throw new BadRequestException('Document not found');
        }

        return {
            url: doc.filePath.startsWith('http')
                ? doc.filePath
                : await this.s3.getSignedUrl(this.s3.normalizeKey(doc.filePath)),
        };
    }

    @Delete(':id/documents/:documentId')
    @ApiOperation({ summary: 'Delete a document', description: 'Deletes the document record from the database.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    @ApiParam({ name: 'documentId', description: 'Document UUID' })
    @ApiResponse({ status: 200, description: 'Document deleted successfully.' })
    @ApiResponse({ status: 404, description: 'Document not found.' })
    async deleteDocument(
        @Param('id') id: string,
        @Param('documentId') documentId: string,
    ) {
        const doc = await this.prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!doc) {
            throw new BadRequestException('Document not found');
        }

        await this.prisma.document.delete({ where: { id: documentId } });

        return { message: 'Document deleted successfully' };
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete loan application', description: 'Only DRAFT applications can be deleted.' })
    @ApiParam({ name: 'id', description: 'Loan Application UUID' })
    @ApiResponse({ status: 200, description: 'Loan application deleted successfully.' })
    @ApiResponse({ status: 400, description: 'Cannot delete — application is not in DRAFT status.' })
    @ApiResponse({ status: 404, description: 'Loan application not found.' })
    remove(@Param('id') id: string) {
        return this.loanApplicationsService.remove(id);
    }
}
