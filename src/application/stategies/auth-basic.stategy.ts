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

        async validate(username: string, password: string): Promise<Application> {
            if (!username || !password) {
                throw new UnauthorizedException({
                    statusCode: HttpStatus.UNAUTHORIZED,
                    error: 'Authentication error',
                    message: ['Username and password are required']
                });
            }

            const app = await this.appService.findOneByField({
                clientId: username,
                privateKey: password
            });
            
            if (!app) {
                throw new UnauthorizedException({
                    statusCode: HttpStatus.UNAUTHORIZED,
                    error: 'Authentication error',
                    message: ['Invalid credentials']
                });
            }
            
            return app;
        }
    }
