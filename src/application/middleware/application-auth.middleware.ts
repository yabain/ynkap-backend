import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApplicationAuthService } from '../services/application-auth.service';

@Injectable()
export class ApplicationAuthMiddleware implements NestMiddleware {
    constructor(private readonly applicationAuthService: ApplicationAuthService) {}

    async use(req: Request, res: Response, next: NextFunction) {
        try {
            // Vérifier si c'est une route d'authentification d'application
            if (req.path === '/application-auth/login' && req.method === 'POST') {
                // Extraire les credentials du header Authorization Basic
                const authHeader = req.headers.authorization;
                
                if (!authHeader || !authHeader.startsWith('Basic ')) {
                    throw new UnauthorizedException('Basic authentication required');
                }

                // Décoder les credentials
                const base64Credentials = authHeader.split(' ')[1];
                const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
                const [clientId, privateKey] = credentials.split(':');

                if (!clientId || !privateKey) {
                    throw new UnauthorizedException('Invalid credentials format');
                }

                // Valider les credentials
                const validationResult = await this.applicationAuthService.validateApplication(
                    clientId, 
                    privateKey, 
                    req
                );

                // Attacher les informations validées à la requête
                (req as any).applicationAuth = validationResult;
            }

            next();
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                res.status(401).json({
                    statusCode: 401,
                    error: 'Unauthorized',
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            res.status(500).json({
                statusCode: 500,
                error: 'Internal Server Error',
                message: 'Authentication system error',
                timestamp: new Date().toISOString()
            });
        }
    }
}