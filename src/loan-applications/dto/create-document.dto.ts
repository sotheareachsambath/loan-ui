import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDocumentDto {
    @ApiProperty({
        example: 'documents/521000cf-c7a1-4f31-9ed4-75cf139cdc5c.JPEG',
        description: 'Stored asset key/path or a direct URL to the uploaded document.',
    })
    @IsString()
    filePath: string;

    @ApiProperty({
        example: 'ID',
        enum: ['ID', 'COLLATERAL', 'INCOME_PROOF', 'OTHER'],
        description: 'Type of document.',
    })
    @IsString()
    documentType: string;

    @ApiPropertyOptional({
        example: 'passport.pdf',
        description: 'Stored file key or file name reference.',
    })
    @IsOptional()
    @IsString()
    fileName?: string;

    @ApiPropertyOptional({
        example: 'passport.pdf',
        description: 'Original file name shown in the UI.',
    })
    @IsOptional()
    @IsString()
    originalName?: string;

    @ApiPropertyOptional({
        example: 'application/pdf',
        description: 'MIME type for display purposes.',
    })
    @IsOptional()
    @IsString()
    mimeType?: string;

    @ApiPropertyOptional({
        example: 248193,
        description: 'File size in bytes.',
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    fileSize?: number;
}
