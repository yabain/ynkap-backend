import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_CONSTANT } from 'src/shared/config';

@Injectable()
export class AuthJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: JWT_CONSTANT.secret
        });
    }

    async validate(payload: any) {
        // Vérifier que le payload contient les informations nécessaires
        if (!payload.clientId || !payload.appId) {
            throw new UnauthorizedException('Invalid token payload');
        }

        return {
            clientId: payload.clientId,
            appId: payload.appId,
            sub: payload.sub,
            name: payload.name,
            environment: payload.environment,
            permissions: payload.permissions,
            keyId: payload.keyId,
            iat: payload.iat,
            exp: payload.exp
        };
    }
}