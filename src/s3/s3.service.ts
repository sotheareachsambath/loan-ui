import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class S3Service {
    private s3: S3Client;
    private bucket: string;
    private region: string;
    private readonly logger = new Logger(S3Service.name);

    constructor() {
        this.region = process.env.AWS_REGION || 'ap-southeast-1';
        this.bucket = process.env.AWS_S3_BUCKET || '';

        const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';

        this.logger.log(`S3 config: region=${this.region}, bucket=${this.bucket}, keyId=${accessKeyId ? accessKeyId.substring(0, 8) + '...' : 'MISSING'}`);

        this.s3 = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }

    async upload(
        file: Express.Multer.File,
        folder: string = 'documents',
    ): Promise<{ key: string; url: string }> {
        if (!this.bucket) {
            throw new InternalServerErrorException('AWS_S3_BUCKET is not configured');
        }

        const ext = extname(file.originalname);
        const key = `${folder}/${randomUUID()}${ext}`;

        try {
            await this.s3.send(
                new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                }),
            );
        } catch (error) {
            this.logger.error(`S3 upload failed: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to upload file: ${error.message}`);
        }

        const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

        return { key, url };
    }

    async delete(key: string): Promise<void> {
        try {
            await this.s3.send(
                new DeleteObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                }),
            );
        } catch (error) {
            this.logger.error(`S3 delete failed: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to delete file: ${error.message}`);
        }
    }

    async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        return getSignedUrl(this.s3, command, { expiresIn });
    }
}
