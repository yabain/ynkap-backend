import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { KeycloakConnectOptions, KeycloakConnectOptionsFactory, PolicyEnforcementMode, TokenValidation } from "nest-keycloak-connect";


@Injectable()
export class KeycloakConfigService implements KeycloakConnectOptionsFactory {
    constructor(private configService: ConfigService) {}

    createKeycloakConnectOptions(): Promise<KeycloakConnectOptions> | KeycloakConnectOptions {
        return {
            authServerUrl: this.configService.get<string>('KEYCLOAK_SERVER_URI'),
            realm: this.configService.get<string>('KEYCLOAK_SERVER_REALM'),
            clientId: this.configService.get<string>('KEYCLOAK_SERVER_CLIENTID'),
            secret: this.configService.get<string>('KEYCLOAK_SERVER_SECRET'),
            policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
            tokenValidation: TokenValidation.ONLINE
        }
    }
}