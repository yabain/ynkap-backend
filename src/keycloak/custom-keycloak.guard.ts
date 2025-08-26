import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CustomKeycloakGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Ignorer Keycloak pour toutes les routes application-auth
    if (request.url.startsWith('/application-auth')) {
      return true;
    }
    
    // Vérifier si la route est marquée comme publique
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    // Pour les autres routes, on laisse passer (Keycloak sera géré par d'autres gardes)
    // Ou vous pouvez implémenter votre propre logique Keycloak ici
    return true;
  }
}


