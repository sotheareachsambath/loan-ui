import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    /**
     * POST /api/auth/login
     * Validates credentials and returns a JWT token + user data.
     */
    async login(dto: LoginDto) {
        // 1. Find user by email
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { roles: { select: { role: true } } },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // 2. Check account status
        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedException(
                'Your account is not active. Please contact an administrator.',
            );
        }

        // 3. Verify password
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // 4. Generate JWT token
        const roles = user.roles.map((r) => r.role);
        const payload = {
            sub: user.id,
            email: user.email,
            roles,
        };

        const accessToken = this.jwtService.sign(payload);

        // 5. Return token + user info (never return the password)
        const { password, roles: userRoles, ...userWithoutPassword } = user;

        return {
            accessToken,
            user: {
                ...userWithoutPassword,
                roles,
            },
        };
    }

    /**
     * POST /api/auth/register
     * Creates a new customer account and returns a JWT token.
     */
    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                ...dto,
                password: hashedPassword,
                status: 'ACTIVE',
                roles: {
                    create: [{ role: 'CUSTOMER' }],
                },
            },
            include: { roles: { select: { role: true } } },
        });

        const roles = user.roles.map((r) => r.role);
        const payload = {
            sub: user.id,
            email: user.email,
            roles,
        };

        const accessToken = this.jwtService.sign(payload);

        const { password, roles: userRoles, ...userWithoutPassword } = user;

        return {
            accessToken,
            user: {
                ...userWithoutPassword,
                roles,
            },
        };
    }

    /**
     * GET /api/auth/me
     * Returns the current authenticated user's profile.
     */
    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
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
            throw new UnauthorizedException('User not found');
        }

        return {
            ...user,
            roles: user.roles.map((r) => r.role),
        };
    }
}
