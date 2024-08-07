import { Injectable } from "@nestjs/common";
import { AuthGuard, ResourceGuard, RoleGuard } from "nest-keycloak-connect";



@Injectable()
export class KeycloakAuthGuard extends AuthGuard {}

@Injectable()
export class KeycloakResourceGuard extends ResourceGuard {}

@Injectable()
export class KeycloakRoleGuard extends RoleGuard {}