import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
    constructor(
        private prisma: PrismaService,
        private s3: S3Service,
    ) { }
    
    async upload(
        file: Express.Multer.File,
        folder: string = 'general',
        uploadedById?: string,
    ) {
        const normalizedUploadedById = await this.normalizeUploadedById(uploadedById);
        const { key, url } = await this.s3.upload(file, folder);

        try {
            return await this.prisma.asset.create({
                data: {
                    fileName: file.originalname,
                    key,
                    url,
                    mimeType: file.mimetype,
                    fileSize: file.size,
                    folder,
                    uploadedById: normalizedUploadedById,
                },
            });
        } catch (error) {
            await this.s3.delete(key).catch(() => undefined);
            throw error;
        }
    }

    async uploadMany(
        files: Express.Multer.File[],
        folder: string = 'general',
        uploadedById?: string,
    ) {
        return Promise.all(
            files.map((file) => this.upload(file, folder, uploadedById)),
        );
    }

    async findAll(currentUserId: string, query?: {
        folder?: string;
        page?: number;
        limit?: number;
    }) {
        this.ensureAuthenticatedUser(currentUserId);

        const page = query?.page || 1;
        const limit = query?.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        where.uploadedById = currentUserId;
        if (query?.folder) where.folder = query.folder;

        const [assets, total] = await Promise.all([
            this.prisma.asset.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    uploadedBy: {
                        select: { id: true, firstName: true, lastName: true },
                    },
                },
            }),
            this.prisma.asset.count({ where }),
        ]);

        return {
            data: assets,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findOne(id: string, currentUserId: string) {
        this.ensureAuthenticatedUser(currentUserId);

        const asset = await this.prisma.asset.findFirst({
            where: { id, uploadedById: currentUserId },
            include: {
                uploadedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        if (!asset) {
            throw new NotFoundException('Asset not found');
        }

        return asset;
    }

    async getSignedUrl(id: string, currentUserId: string) {
        const asset = await this.findOne(id, currentUserId);
        const signedUrl = await this.s3.getSignedUrl(asset.key);
        return { ...asset, signedUrl, expiresIn: 3600 };
    }

    async update(id: string, dto: UpdateAssetDto, currentUserId: string) {
        await this.findOne(id, currentUserId);

        return this.prisma.asset.update({
            where: { id },
            data: {
                ...(dto.fileName && { fileName: dto.fileName }),
                ...(dto.folder && { folder: dto.folder }),
            },
        });
    }

    async replace(id: string, file: Express.Multer.File, currentUserId: string) {
        const asset = await this.findOne(id, currentUserId);

        // Delete old file from S3
        await this.s3.delete(asset.key);

        // Upload new file
        const { key, url } = await this.s3.upload(file, asset.folder);

        return this.prisma.asset.update({
            where: { id },
            data: {
                fileName: file.originalname,
                key,
                url,
                mimeType: file.mimetype,
                fileSize: file.size,
            },
        });
    }

    async remove(id: string, currentUserId: string) {
        const asset = await this.findOne(id, currentUserId);

        // Delete from S3
        await this.s3.delete(asset.key);

        // Delete from database
        await this.prisma.asset.delete({ where: { id } });

        return { message: 'Asset deleted successfully' };
    }

    private async normalizeUploadedById(uploadedById?: string) {
        const normalizedUploadedById = uploadedById?.trim() || undefined;

        if (!normalizedUploadedById) {
            return undefined;
        }

        const user = await this.prisma.user.findUnique({
            where: { id: normalizedUploadedById },
            select: { id: true },
        });

        if (!user) {
            throw new BadRequestException('uploadedById does not match an existing user');
        }

        return normalizedUploadedById;
    }

    private ensureAuthenticatedUser(currentUserId?: string) {
        if (!currentUserId) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
