import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadAssetDto {
    @ApiPropertyOptional({
        example: 'documents',
        description: 'Folder to organize files: general, avatars, documents, etc.',
    })
    @IsString()
    @IsOptional()
    folder?: string;
}
