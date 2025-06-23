import { Module } from "@nestjs/common";
import { KeycloakConfigService } from "./keycloak-config.service";
import { KeycloakConnectModule, AuthGuard, ResourceGuard, RoleGuard } from "nest-keycloak-connect";
import { HttpModule } from "@nestjs/axios";
import { KeycloakApiService } from "./keycloak-api.service";
import { KeycloakAuthGuard, KeycloakResourceGuard, KeycloakRoleGuard } from "./keycloak.guard";

@Module({
    imports: [
        KeycloakConnectModule.registerAsync({
            useClass: KeycloakConfigService
        }),
        HttpModule
    ],
    providers: [
        KeycloakConfigService, 
        KeycloakApiService,
        KeycloakAuthGuard,
        KeycloakResourceGuard,
        KeycloakRoleGuard
    ],
    exports: [
        KeycloakConnectModule, 
        KeycloakApiService,
        KeycloakAuthGuard,
        KeycloakResourceGuard,
        KeycloakRoleGuard
    ]
})
export class KeycloakModule {}
