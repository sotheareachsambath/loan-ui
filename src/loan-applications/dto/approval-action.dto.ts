import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum ApprovalAction {
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    RETURNED = 'RETURNED',
}

enum ApprovalLevel {
    OFFICER = 'OFFICER',
    MANAGER = 'MANAGER',
    DIRECTOR = 'DIRECTOR',
}

export class ApprovalActionDto {
    @ApiProperty({ description: 'UUID of the approver' })
    @IsString()
    @IsNotEmpty()
    approverId: string;

    @ApiProperty({ enum: ApprovalLevel, description: 'Approval level matching the approver role' })
    @IsEnum(ApprovalLevel)
    level: ApprovalLevel;

    @ApiProperty({ enum: ApprovalAction, description: 'APPROVED, REJECTED, or RETURNED for rework' })
    @IsEnum(ApprovalAction)
    action: ApprovalAction;

    @ApiPropertyOptional({ example: 'All documents verified, approved.' })
    @IsString()
    @IsOptional()
    comments?: string;
}
