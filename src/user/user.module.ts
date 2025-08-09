import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { HttpModule } from "@nestjs/axios";
import { User, UserSchema } from "./models/user.shema";
import { SharedModule } from "src/shared/shared.module";
import { UserService } from "./services/user.services";
import { UserController } from "./controllers/user.controller";
import { ManagerController } from "./controllers/manager.controller";
import { KeycloakApiService } from "../keycloak/keycloak-api.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name:User.name,
                schema:UserSchema
            }
        ]),
        SharedModule,
        HttpModule
    ],
    controllers: [UserController, ManagerController],
    providers: [UserService, KeycloakApiService],
    exports: [UserService]
})

export class UserModule {}