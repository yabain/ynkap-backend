import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class KeycloakDebugMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log('--- Keycloak Debug Middleware ---');
    console.log('Headers:', req.headers);
    console.log('Authorization:', req.headers.authorization);
    console.log('Cookies:', req.cookies);
    console.log('User:', req.user);
    
    // Continuer le traitement de la requête
    next();
  }
}