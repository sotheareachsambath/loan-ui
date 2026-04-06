import {
    IsArray,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserRole {
    ADMIN = 'ADMIN',
    DIRECTOR = 'DIRECTOR',
    MANAGER = 'MANAGER',
    LOAN_OFFICER = 'LOAN_OFFICER',
    TELLER = 'TELLER',
    CUSTOMER = 'CUSTOMER',
}

export class CreateUserDto {
    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'password123', minLength: 6 })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiPropertyOptional({ example: '+855123456789' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({
        enum: UserRole,
        isArray: true,
        example: ['LOAN_OFFICER', 'MANAGER'],
        description: 'Array of roles to assign. Defaults to [CUSTOMER] if not provided.',
    })
    @IsArray()
    @IsEnum(UserRole, { each: true })
    @IsOptional()
    roles?: UserRole[];

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    avatar?: string;
}
