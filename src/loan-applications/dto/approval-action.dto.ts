import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
    @IsString()
    @IsNotEmpty()
    approverId: string;

    @IsEnum(ApprovalLevel)
    level: ApprovalLevel;

    @IsEnum(ApprovalAction)
    action: ApprovalAction;

    @IsString()
    @IsOptional()
    comments?: string;
}
