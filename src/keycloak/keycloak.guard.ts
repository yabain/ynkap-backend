import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { 
    AuthGuard, 
    ResourceGuard, 
    RoleGuard
} from "nest-keycloak-connect";

@Injectable()
export class KeycloakAuthGuard {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // Vérifier si la route est marquée comme publique
        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        // Pour les routes non publiques, nous laissons le garde Keycloak s'en occuper
        // Cette garde sera appelée après PublicRouteGuard
        return true;
    }
}

@Injectable()
export class KeycloakResourceGuard {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // Vérifier si la route est marquée comme publique
        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        // Pour les routes non publiques, nous laissons le garde Keycloak s'en occuper
        return true;
    }
}

@Injectable()
export class KeycloakRoleGuard {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // Vérifier si la route est marquée comme publique
        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        // Pour les routes non publiques, nous laissons le garde Keycloak s'en occuper
        return true;
    }
}
