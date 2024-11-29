import { ExecutionContext, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class AuthJwtGuard extends AuthGuard("jwt")
{
    handleRequest<TUser = any>(err: any, app: any, info: any, context: ExecutionContext, status?: any): TUser {
        if (err || !app) {
            throw err || new UnauthorizedException({
                statusCode:HttpStatus.UNAUTHORIZED,
                error:'Authentification error',
                message:[info.message]
            });
          }
        return app;        
    }
}