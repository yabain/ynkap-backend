import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ApplicationService } from './application.services';
import { KeyAuditService } from './key-audit.service';
import { ApplicationKey, ApplicationKeyDocument } from '../models/application-key.schema';
import { Application, ApplicationDocument } from '../models/application.schema';
import { JWT_CONSTANT } from 'src/shared/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApplicationAuthService {
    constructor(
        @InjectModel(ApplicationKey.name) private applicationKeyModel: Model<ApplicationKeyDocument>,
        private readonly applicationService: ApplicationService,
        private readonly keyAuditService: KeyAuditService,
        public readonly jwtService: JwtService
    ) {}

    async validateApplication(clientId: string, privateKey: string, req: any): Promise<{
        application: ApplicationDocument;
        applicationKey: ApplicationKeyDocument;
        environment: 'test' | 'prod';
    }> {
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';

        try {
            console.log('🔍 [validateApplication] Starting validation for clientId:', clientId);
            
            // 1. Recherche de la clé par clientId
            console.log('🔍 [validateApplication] Step 1: Searching for application key...');
            const applicationKey = await this.applicationKeyModel.findOne({
                clientId,
                isActive: true
            }).populate('applicationId');

            if (!applicationKey) {
                console.log('❌ [validateApplication] Application key not found');
                await this.logFailedAttempt(clientId, ipAddress, userAgent, 'Client ID not found');
                throw new UnauthorizedException('Invalid client credentials');
            }
            console.log('✅ [validateApplication] Application key found');

            // 2. Vérification bcrypt de la clé privée
            console.log('🔍 [validateApplication] Step 2: Verifying private key...');
            const isValidPrivateKey = await bcrypt.compare(privateKey, applicationKey.privateKeyHash);
            if (!isValidPrivateKey) {
                console.log('❌ [validateApplication] Invalid private key');
                await this.logFailedAttempt(clientId, ipAddress, userAgent, 'Invalid private key');
                throw new UnauthorizedException('Invalid client credentials');
            }
            console.log('✅ [validateApplication] Private key valid');

            // 3. Vérification de l'expiration de la clé
            console.log('🔍 [validateApplication] Step 3: Checking key expiration...');
            if (applicationKey.expiresAt && new Date() > applicationKey.expiresAt) {
                console.log('❌ [validateApplication] Key expired');
                await this.logFailedAttempt(clientId, ipAddress, userAgent, 'Key expired');
                throw new UnauthorizedException('Client credentials expired');
            }
            console.log('✅ [validateApplication] Key not expired');

            // 4. Récupération de l'application
            console.log('🔍 [validateApplication] Step 4: Fetching application...');
            // Vérifier si l'application est déjà populée
            let application: ApplicationDocument;
            if (typeof applicationKey.applicationId === 'string') {
                // Si c'est un string, faire un appel à la base
                application = await this.applicationService.findById(applicationKey.applicationId, null);
            } else {
                // Si c'est déjà populé, l'utiliser directement
                application = applicationKey.applicationId as ApplicationDocument;
            }

            if (!application) {
                console.log('❌ [validateApplication] Application not found');
                await this.logFailedAttempt(clientId, ipAddress, userAgent, 'Application not found');
                throw new UnauthorizedException('Invalid client credentials');
            }
            console.log('✅ [validateApplication] Application found:', application.name);

            // 5. Vérification que l'application n'est pas supprimée
            console.log('🔍 [validateApplication] Step 5: Checking if application is deleted...');
            if (application.isDeleted) {
                console.log('❌ [validateApplication] Application is deleted');
                await this.logFailedAttempt(clientId, ipAddress, userAgent, 'Application deleted');
                throw new UnauthorizedException('Application no longer available');
            }
            console.log('✅ [validateApplication] Application is active');

            // 6. Vérification de l'environnement activé
            console.log('🔍 [validateApplication] Step 6: Checking environment...');
            const environment = applicationKey.environment;
            console.log('🔍 [validateApplication] Environment:', environment);
            
            if (environment === 'prod' && !application.envProd) {
                console.log('❌ [validateApplication] Production environment disabled');
                await this.logFailedAttempt(clientId, ipAddress, userAgent, 'Production environment disabled');
                throw new UnauthorizedException('Production environment not enabled');
            }
            
            if (environment === 'test' && !application.envTest) {
                console.log('❌ [validateApplication] Test environment disabled');
                await this.logFailedAttempt(clientId, ipAddress, userAgent, 'Test environment disabled');
                throw new UnauthorizedException('Test environment not enabled');
            }
            console.log('✅ [validateApplication] Environment check passed');

            console.log('✅ [validateApplication] All validations passed successfully');
            return {
                application,
                applicationKey,
                environment
            };

        } catch (error) {
            console.log('❌ [validateApplication] Error caught:', error.message);
            console.log('❌ [validateApplication] Error type:', error.constructor.name);
            console.log('❌ [validateApplication] Error stack:', error.stack);
            
            if (error instanceof UnauthorizedException) {
                throw error;
            }

            await this.logFailedAttempt(clientId, ipAddress, userAgent, error.message);
            throw new UnauthorizedException('Authentication system error');
        }
    }

    async login(validationResult: {
        application: ApplicationDocument;
        applicationKey: ApplicationKeyDocument;
        environment: 'test' | 'prod';
    }) {
        const { application, applicationKey, environment } = validationResult;

        // Payload JWT enrichi
        const payload = {
            clientId: applicationKey.clientId,
            appId: application._id.toString(),
            sub: application._id.toString(), // Subject standard JWT
            name: application.name,
            environment,
            permissions: applicationKey.permissions || {
                payments: true,
                wallet: true,
                messages: true
            },
            keyId: applicationKey._id.toString(),
            iat: Math.floor(Date.now() / 1000), // Issued at
            iss: 'y-nkap-api' // Issuer
        };

        const accessToken = this.jwtService.sign(payload, {
            secret: JWT_CONSTANT.secret,
            expiresIn: JWT_CONSTANT.expiresIn
        });

        return {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600, // 1 heure en secondes
            environment,
            permissions: payload.permissions,
            issued_at: new Date().toISOString()
        };
    }

    async refreshToken(payload: {
        clientId: string;
        appId: string;
        sub: string;
        name: string;
        environment: 'test' | 'prod';
        permissions: Record<string, boolean>;
        keyId: string;
    }) {
        const newPayload = {
            ...payload,
            iat: Math.floor(Date.now() / 1000),
            iss: 'y-nkap-api'
        };

        const accessToken = this.jwtService.sign(newPayload, {
            secret: JWT_CONSTANT.secret,
            expiresIn: JWT_CONSTANT.expiresIn
        });

        return {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            environment: payload.environment,
            refreshed_at: new Date().toISOString()
        };
    }

    private async logFailedAttempt(clientId: string, ipAddress: string, userAgent: string, errorMessage: string) {
        try {
            // Essayer de trouver l'application même avec des credentials invalides
            const applicationKey = await this.applicationKeyModel.findOne({ clientId });
            let applicationId = 'unknown';
            let environment: 'test' | 'prod' = 'test';

            if (applicationKey) {
                applicationId = applicationKey.applicationId.toString();
                environment = applicationKey.environment;
            }

            await this.keyAuditService.logAuthAttempt({
                applicationId,
                clientId,
                environment,
                ipAddress,
                userAgent,
                success: false,
                errorMessage
            });
        } catch (auditError) {
            console.error('Failed to log failed authentication attempt:', auditError);
        }
    }
}
