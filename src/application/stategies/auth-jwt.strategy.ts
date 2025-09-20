import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { JWT_CONSTANT } from "src/shared/config"

export class AuthJwtStrategy extends PassportStrategy(Strategy)
{
    constructor()
    {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: JWT_CONSTANT.secret
        })
    }

    async validate(payload:Record<string,any>)
    {
        return {clientId:payload.clientId,userId:payload.sub,appId:payload.sub}
    }
}