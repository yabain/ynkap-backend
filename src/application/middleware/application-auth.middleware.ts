    import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
    import { Request, Response, NextFunction } from 'express';
    import { ApplicationAuthService } from '../services/application-auth.service';

    @Injectable()
    export class ApplicationAuthMiddleware implements NestMiddleware {
        constructor(private readonly applicationAuthService: ApplicationAuthService) {}

        async use(req: Request, res: Response, next: NextFunction) {
            try {
                console.log('🔍 ApplicationAuthMiddleware - Path:', req.path, 'Method:', req.method);
                console.log('🔍 ApplicationAuthMiddleware - URL:', req.url);
                console.log('🔍 ApplicationAuthMiddleware - originalUrl:', req.originalUrl);
                
                // Vérifier si c'est une route d'authentification d'application
                const isLoginRoute = (req.path === '/application-auth/login' || 
                                    req.url === '/application-auth/login' || 
                                    req.originalUrl === '/application-auth/login' ||
                                    req.url.endsWith('/application-auth/login')) && 
                                    req.method === 'POST';
                
                if (isLoginRoute) {
                    console.log('🔍 Processing application auth login...');
                    
                    // Extraire les credentials du header Authorization Basic
                    const authHeader = req.headers.authorization;
                    console.log('🔍 Auth header:', authHeader ? 'Present' : 'Missing');
                    
                    if (!authHeader || !authHeader.startsWith('Basic ')) {
                        console.log('❌ Basic authentication header missing or invalid');
                        throw new UnauthorizedException('Basic authentication required');
                    }

                    // Décoder les credentials
                    const base64Credentials = authHeader.split(' ')[1];
                    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
                    const [clientId, privateKey] = credentials.split(':');
                    
                    console.log('🔍 ClientId:', clientId);
                    console.log('🔍 PrivateKey length:', privateKey?.length);

                    if (!clientId || !privateKey) {
                        console.log('❌ Invalid credentials format');
                        throw new UnauthorizedException('Invalid credentials format');
                    }

                    console.log('🔍 Calling validateApplication...');
                    // Valider les credentials
                    const validationResult = await this.applicationAuthService.validateApplication(
                        clientId, 
                        privateKey, 
                        req
                    );
                    
                    console.log('✅ Validation successful');
                    // Attacher les informations validées à la requête
                    (req as any).applicationAuth = validationResult;
                }

                next();
            } catch (error) {
                console.log('❌ ApplicationAuthMiddleware error:', error.message);
                console.log('❌ Error stack:', error.stack);
                
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

