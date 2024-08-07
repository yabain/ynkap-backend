import { Module } from "@nestjs/common";
import { KeycloakConfigService } from "./keycloak-config.service";
import { KeycloakConnectModule } from "nest-keycloak-connect";


@Module({
    imports: [
        KeycloakConnectModule.registerAsync({
            useClass: KeycloakConfigService
        })
    ],
    providers: [KeycloakConfigService],
    exports: [KeycloakConnectModule]
})
export class KeycloakModule {

}