import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateUserDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const roles = dto.roles && dto.roles.length > 0 ? dto.roles : ['CUSTOMER' as const];

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
                avatar: dto.avatar,
                roles: {
                    create: roles.map((role) => ({ role: role as UserRole })),
                },
            },
            include: {
                roles: { select: { role: true } },
            },
        });

        const { password: _, roles: userRoles, ...result } = user;
        return {
            ...result,
            roles: userRoles.map((r) => r.role),
        };
    }

    async findAll(query?: { role?: string; status?: string; page?: number; limit?: number }) {
        const page = query?.page || 1;
        const limit = query?.limit || 10;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (query?.role) {
            where.roles = { some: { role: query.role } };
        }
        if (query?.status) where.status = query.status;

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    roles: { select: { role: true } },
                    status: true,
                    avatar: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: users.map((u) => ({
                ...u,
                roles: u.roles.map((r) => r.role),
            })),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                roles: { select: { role: true } },
                status: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            ...user,
            roles: user.roles.map((r) => r.role),
        };
    }

    async update(id: string, dto: UpdateUserDto) {
        await this.findOne(id);

        const data: any = { ...dto };
        delete data.roles;

        if (dto.password) {
            data.password = await bcrypt.hash(dto.password, 10);
        }

        // If roles are provided, replace all existing roles
        if (dto.roles && dto.roles.length > 0) {
            await this.prisma.$transaction([
                this.prisma.userRoleAssignment.deleteMany({ where: { userId: id } }),
                this.prisma.userRoleAssignment.createMany({
                    data: dto.roles.map((role) => ({ userId: id, role })),
                }),
            ]);
        }

        const user = await this.prisma.user.update({
            where: { id },
            data,
            include: {
                roles: { select: { role: true } },
            },
        });

        const { password, roles: userRoles, ...result } = user;
        return {
            ...result,
            roles: userRoles.map((r) => r.role),
        };
    }

    async remove(id: string) {
        await this.findOne(id);
        await this.prisma.user.delete({ where: { id } });
        return { message: 'User deleted successfully' };
    }
}
