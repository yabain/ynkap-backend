import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./models/user.shema";
import { SharedModule } from "src/shared/shared.module";
import { UserService } from "./services/user.services";
import { UserController } from "./controllers/user.controller";
import { ManagerController } from "./controllers/manager.controller";

@Module({
    imports: [
        MongooseModule.forFeature([
            { 
                name:User.name, 
                schema:UserSchema
            }
        ]),
        SharedModule
    ],
    controllers: [UserController, ManagerController],
    providers: [UserService],
    exports: [UserService]
})

export class UserModule {}