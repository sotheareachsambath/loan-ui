import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED',
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiPropertyOptional({ enum: UserStatus })
    @IsEnum(UserStatus)
    @IsOptional()
    status?: UserStatus;
}
