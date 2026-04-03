import {
    Controller,
    Post,
    Get,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'User login',
        description: 'Authenticate with email and password. Returns a JWT access token and user profile data.',
    })
    @ApiResponse({
        status: 200,
        description: 'Login successful. Returns access token and user data.',
        schema: {
            example: {
                accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                user: {
                    id: 'uuid',
                    email: 'admin@loan.com',
                    firstName: 'Admin',
                    lastName: 'User',
                    role: 'ADMIN',
                    status: 'ACTIVE',
                    avatar: null,
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-01T00:00:00.000Z',
                },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Invalid email or password / Account not active.' })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Register a new account',
        description: 'Create a new customer account. Returns a JWT access token and user profile data.',
    })
    @ApiResponse({
        status: 201,
        description: 'Registration successful. Returns access token and user data.',
        schema: {
            example: {
                accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                user: {
                    id: 'uuid',
                    email: 'john@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'CUSTOMER',
                    status: 'ACTIVE',
                    createdAt: '2026-04-03T00:00:00.000Z',
                    updatedAt: '2026-04-03T00:00:00.000Z',
                },
            },
        },
    })
    @ApiResponse({ status: 409, description: 'Email already exists.' })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get current user profile',
        description: 'Returns the authenticated user\'s profile. Requires a valid JWT Bearer token.',
    })
    @ApiResponse({
        status: 200,
        description: 'Current user profile.',
    })
    @ApiResponse({ status: 401, description: 'Invalid or expired token.' })
    async getProfile(@CurrentUser('id') userId: string) {
        return this.authService.getProfile(userId);
    }
}
