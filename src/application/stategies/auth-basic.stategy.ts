import { HttpStatus, UnauthorizedException,Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { BasicStrategy as Strategy } from "passport-http"
import { Application } from "./../models";
import { ApplicationService } from "./../services";

@Injectable()
export class BasicStrategy extends PassportStrategy(Strategy)
{
    constructor( private readonly appService:ApplicationService)
    {
        super()
        /**
         * {
            passReqToCallback: true,
          }
         */
    }

    async validate(username,password):Promise<Application>
    {
        let app=await this.appService.findOneByField({clientId:username,privateKey:password})
        if(app) return app;
        throw new UnauthorizedException({
            statusCode:HttpStatus.UNAUTHORIZED,
            error:'Authentification error',
            message:['Application not found']
        })
    }
}