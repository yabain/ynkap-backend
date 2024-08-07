import { HttpException, HttpStatus, Injectable, NestMiddleware } from "@nestjs/common";
import { UserService } from "../services/user.services";

@Injectable()
export class CreateUserMiddleware implements NestMiddleware {

    constructor(private userService: UserService) {}

    async use(req: any, res: any, next: (error?: any) => void)
    {
        try {
            const userSub = req.user.sub

            if(typeof userSub === 'string') {
                const existingUser = await this. userService.findOneByField({ sub: userSub });
                if(!existingUser) await this.userService.create({ sub: userSub });
            } else {
                throw new HttpException('Invalid user sub', HttpStatus.BAD_REQUEST);
            }     
            next();
            
        } catch (error) {
            console.log("Error :", error)
        }

    }
}