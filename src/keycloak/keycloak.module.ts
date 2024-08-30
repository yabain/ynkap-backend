import { Module } from "@nestjs/common";
import { KeycloakConfigService } from "./keycloak-config.service";
import { KeycloakConnectModule } from "nest-keycloak-connect";
import { HttpModule } from "@nestjs/axios";
import { KeycloakApiService } from "./keycloak-api.service";


@Module({
    imports: [
        KeycloakConnectModule.registerAsync({
            useClass: KeycloakConfigService
        }),
        HttpModule
    ],
    providers: [KeycloakConfigService, KeycloakApiService],
    exports: [KeycloakConnectModule, KeycloakApiService]
})
export class KeycloakModule {

}