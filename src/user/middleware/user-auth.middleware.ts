import { HttpException, HttpStatus, Injectable, NestMiddleware, Request } from "@nestjs/common";
import { UserService } from "../services/user.services";

@Injectable()
export class CreateUserMiddleware implements NestMiddleware {

    constructor(private userService: UserService) {}

    async use(@Request() req, res: any, next: (error?: any) => void)
    {
        try {
            
            console.log('req :', req.user)
            const userSub = req.user.sub

            if(typeof userSub === 'string') {
                const existingUser = await this. userService.findOneByField({ sub: userSub });
                if(!existingUser) await this.userService.create({ sub: userSub });
            } else {
                throw new HttpException('Invalid user sub', HttpStatus.BAD_REQUEST);
            }     
            next();
            
        } catch (error) {
            console.error("Error :", error);
            next(error);
        }

    }
}