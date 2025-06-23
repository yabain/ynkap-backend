import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApplicationService } from './application.services';
import { JWT_CONSTANT } from 'src/shared/config';

@Injectable()
export class ApplicationAuthService {
    constructor(
        private readonly applicationService: ApplicationService,
        private readonly jwtService: JwtService
    ) {}

    async validateApplication(clientId: string, privateKey: string): Promise<any> {
        const app = await this.applicationService.findOneByField({ 
            $or: [
                { clientIdProd: clientId, privateKeyProd: privateKey, envProd: true },
                { clientIdTest: clientId, privateKeytest: privateKey, envTest: true }
            ],
            isDeleted: false
        });

        if (!app) {
            throw new UnauthorizedException('Invalid client credentials');
        }

        return app;
    }

    async login(app: any) {
        const payload = { 
            clientId: app.clientIdProd || app.clientIdTest,
            sub: app._id,
            name: app.name
        };

        return {
            access_token: this.jwtService.sign(payload, {
                secret: JWT_CONSTANT.secret,
                expiresIn: JWT_CONSTANT.expiresIn
            })
        };
    }
}