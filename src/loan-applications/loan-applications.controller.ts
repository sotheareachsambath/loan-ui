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
import { v4 as uuidv4 } from 'uuid';
import { LoanApplicationsService } from './loan-applications.service';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { UpdateLoanApplicationDto } from './dto/update-loan-application.dto';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('loan-applications')
export class LoanApplicationsController {
    constructor(
        private readonly loanApplicationsService: LoanApplicationsService,
        private readonly prisma: PrismaService,
    ) { }

    @Post()
    create(@Body() dto: CreateLoanApplicationDto) {
        return this.loanApplicationsService.create(dto);
    }

    @Get()
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
    findOne(@Param('id') id: string) {
        return this.loanApplicationsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateLoanApplicationDto) {
        return this.loanApplicationsService.update(id, dto);
    }

    // Submit application
    @Post(':id/submit')
    submit(@Param('id') id: string) {
        return this.loanApplicationsService.submit(id);
    }

    // Assign loan officer
    @Post(':id/assign-officer')
    assignOfficer(
        @Param('id') id: string,
        @Body('loanOfficerId') loanOfficerId: string,
    ) {
        return this.loanApplicationsService.assignOfficer(id, loanOfficerId);
    }

    // Process approval (multi-level: officer → manager → director)
    @Post(':id/approve')
    processApproval(@Param('id') id: string, @Body() dto: ApprovalActionDto) {
        return this.loanApplicationsService.processApproval(id, dto);
    }

    // Get approval history
    @Get(':id/approval-history')
    getApprovalHistory(@Param('id') id: string) {
        return this.loanApplicationsService.getApprovalHistory(id);
    }

    // Document upload (ID, collateral docs)
    @Post(':id/documents')
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            storage: diskStorage({
                destination: './uploads/documents',
                filename: (req, file, cb) => {
                    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
                    cb(null, uniqueName);
                },
            }),
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
        // Verify application exists
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

    // Get documents
    @Get(':id/documents')
    async getDocuments(@Param('id') id: string) {
        return this.prisma.document.findMany({
            where: { loanApplicationId: id },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Delete document
    @Delete(':id/documents/:documentId')
    async deleteDocument(
        @Param('id') id: string,
        @Param('documentId') documentId: string,
    ) {
        await this.prisma.document.delete({ where: { id: documentId } });
        return { message: 'Document deleted successfully' };
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.loanApplicationsService.remove(id);
    }
}
