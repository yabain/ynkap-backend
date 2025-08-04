import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApplicationKey, ApplicationKeyDocument } from '../models/application-key.schema';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class ApplicationKeyService {
    constructor(
        @InjectModel(ApplicationKey.name) private applicationKeyModel: Model<ApplicationKeyDocument>
    ) {}

    async createKey(data: {
        applicationId: string;
        environment: 'test' | 'prod';
        permissions?: Record<string, boolean>;
        expiresAt?: Date;
        ipWhitelist?: string[];
        rateLimit?: { requestsPerMinute: number; requestsPerHour: number };
    }): Promise<{ applicationKey: ApplicationKeyDocument; privateKey: string }> {
        const clientId = uuidv4();
        const privateKey = crypto.randomBytes(32).toString('hex');
        const privateKeyHash = await bcrypt.hash(privateKey, 12);

        const applicationKey = new this.applicationKeyModel({
            applicationId: data.applicationId,
            clientId,
            privateKeyHash,
            environment: data.environment,
            permissions: data.permissions || {
                payments: true,
                wallet: true,
                messages: true
            },
            expiresAt: data.expiresAt,
            ipWhitelist: data.ipWhitelist,
            rateLimit: data.rateLimit,
            isActive: true
        });

        await applicationKey.save();

        return {
            applicationKey,
            privateKey // Retourner la clé en clair une seule fois
        };
    }

    async regenerateKey(keyId: string): Promise<{ applicationKey: ApplicationKeyDocument; privateKey: string }> {
        const existingKey = await this.applicationKeyModel.findById(keyId);
        if (!existingKey) {
            throw new NotFoundException('Application key not found');
        }

        const newPrivateKey = crypto.randomBytes(32).toString('hex');
        const newPrivateKeyHash = await bcrypt.hash(newPrivateKey, 12);
        const newClientId = uuidv4();

        existingKey.clientId = newClientId;
        existingKey.privateKeyHash = newPrivateKeyHash;
        existingKey.lastUsedAt = undefined;
        
        await existingKey.save();

        return {
            applicationKey: existingKey,
            privateKey: newPrivateKey
        };
    }

    async deactivateKey(keyId: string): Promise<ApplicationKeyDocument> {
        const key = await this.applicationKeyModel.findByIdAndUpdate(
            keyId,
            { isActive: false },
            { new: true }
        );

        if (!key) {
            throw new NotFoundException('Application key not found');
        }

        return key;
    }

    async getApplicationKeys(applicationId: string): Promise<ApplicationKeyDocument[]> {
        return await this.applicationKeyModel.find({
            applicationId,
            isActive: true
        }).select('-privateKeyHash');
    }

    async updateKeyPermissions(keyId: string, permissions: Record<string, boolean>): Promise<ApplicationKeyDocument> {
        const key = await this.applicationKeyModel.findByIdAndUpdate(
            keyId,
            { permissions },
            { new: true }
        );

        if (!key) {
            throw new NotFoundException('Application key not found');
        }

        return key;
    }
}