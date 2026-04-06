import {
    Controller,
    Get,
    Post,
    Patch,
    Put,
    Delete,
    Param,
    Query,
    Body,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiConsumes,
    ApiBody,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AssetsService } from './assets.service';
import { UpdateAssetDto } from './dto/update-asset.dto';

const ALLOWED_MIMES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const multerOptions = {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req: any, file: any, cb: any) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
        }
    },
};

@ApiBearerAuth()
@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
    constructor(private readonly assetsService: AssetsService) { }

    @Post('upload')
    @ApiOperation({ summary: 'Upload a single file', description: 'Upload a file to S3. Max 10MB. Accepts: images, PDF, DOC, DOCX, XLS, XLSX.' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                folder: { type: 'string', example: 'documents', description: 'Folder name (default: general)' },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'File uploaded successfully.' })
    @ApiResponse({ status: 400, description: 'No file provided or invalid file type.' })
    @UseInterceptors(FileInterceptor('file', multerOptions))
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Body('folder') folder?: string,
        @CurrentUser('id') currentUserId?: string,
    ) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }
        return this.assetsService.upload(file, folder || 'general', currentUserId);
    }

    @Post('upload-multiple')
    @ApiOperation({ summary: 'Upload multiple files', description: 'Upload up to 10 files at once to S3.' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: { type: 'array', items: { type: 'string', format: 'binary' } },
                folder: { type: 'string', example: 'documents' },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Files uploaded successfully.' })
    @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
    async uploadMultiple(
        @UploadedFiles() files: Express.Multer.File[],
        @Body('folder') folder?: string,
        @CurrentUser('id') currentUserId?: string,
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }
        return this.assetsService.uploadMany(files, folder || 'general', currentUserId);
    }

    @Get()
    @ApiOperation({ summary: 'List all assets', description: 'Paginated list with optional folder and uploader filters.' })
    @ApiQuery({ name: 'folder', required: false, example: 'documents' })
    @ApiQuery({ name: 'uploadedById', required: false })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Paginated list of assets.' })
    findAll(
        @Query('folder') folder?: string,
        @Query('uploadedById') uploadedById?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.assetsService.findAll({ folder, uploadedById, page, limit });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get asset by ID' })
    @ApiParam({ name: 'id', description: 'Asset UUID' })
    @ApiResponse({ status: 200, description: 'Asset details.' })
    @ApiResponse({ status: 404, description: 'Asset not found.' })
    findOne(@Param('id') id: string) {
        return this.assetsService.findOne(id);
    }

    @Get(':id/signed-url')
    @ApiOperation({ summary: 'Get signed download URL', description: 'Generate a temporary signed URL (1 hour) to download the file.' })
    @ApiParam({ name: 'id', description: 'Asset UUID' })
    @ApiResponse({ status: 200, description: 'Signed URL with expiry.' })
    @ApiResponse({ status: 404, description: 'Asset not found.' })
    getSignedUrl(@Param('id') id: string) {
        return this.assetsService.getSignedUrl(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update asset metadata', description: 'Update file name or folder. Does not change the actual file.' })
    @ApiParam({ name: 'id', description: 'Asset UUID' })
    @ApiResponse({ status: 200, description: 'Asset updated.' })
    @ApiResponse({ status: 404, description: 'Asset not found.' })
    update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
        return this.assetsService.update(id, dto);
    }

    @Put(':id/replace')
    @ApiOperation({ summary: 'Replace file', description: 'Replace the actual file in S3. Keeps the same asset ID and folder.' })
    @ApiParam({ name: 'id', description: 'Asset UUID' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'File replaced successfully.' })
    @ApiResponse({ status: 404, description: 'Asset not found.' })
    @UseInterceptors(FileInterceptor('file', multerOptions))
    async replace(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }
        return this.assetsService.replace(id, file);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete asset', description: 'Deletes the file from S3 and removes the database record.' })
    @ApiParam({ name: 'id', description: 'Asset UUID' })
    @ApiResponse({ status: 200, description: 'Asset deleted.' })
    @ApiResponse({ status: 404, description: 'Asset not found.' })
    remove(@Param('id') id: string) {
        return this.assetsService.remove(id);
    }
}
