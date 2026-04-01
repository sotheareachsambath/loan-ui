import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEnum, IsOptional } from 'class-validator';

enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED',
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @IsEnum(UserStatus)
    @IsOptional()
    status?: UserStatus;
}
