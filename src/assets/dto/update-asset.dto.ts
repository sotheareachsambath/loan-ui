import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAssetDto {
    @ApiPropertyOptional({ example: 'my-photo.jpg', description: 'Rename the file' })
    @IsString()
    @IsOptional()
    fileName?: string;

    @ApiPropertyOptional({ example: 'avatars', description: 'Move to a different folder' })
    @IsString()
    @IsOptional()
    folder?: string;
}
