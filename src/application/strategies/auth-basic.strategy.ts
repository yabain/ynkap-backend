import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BasicStrategy } from 'passport-http';
import { ApplicationAuthService } from '../services/application-auth.service';
import { Request } from 'express';

@Injectable()
export class AuthBasicStrategy extends PassportStrategy(BasicStrategy) {
    constructor(private readonly applicationAuthService: ApplicationAuthService) {
        super({
            passReqToCallback: true
        });
    }

    async validate(req: Request, username: string, password: string): Promise<any> {
        try {
            // Utiliser le service d'authentification pour valider
            const validationResult = await this.applicationAuthService.validateApplication(
                username, 
                password, 
                req
            );

            // Retourner les informations validées pour Passport
            return {
                application: validationResult.application,
                applicationKey: validationResult.applicationKey,
                environment: validationResult.environment,
                clientId: username
            };
        } catch (error) {
            throw new UnauthorizedException(error.message);
        }
    }
}

