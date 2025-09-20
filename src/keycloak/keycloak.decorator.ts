import { SetMetadata } from '@nestjs/common';

/**
 * Décorateur pour définir les rôles requis pour accéder à une route
 * @param roles Liste des rôles autorisés
 */
export const Roles = (roles: string[]) => SetMetadata('roles', roles);

/**
 * Décorateur pour définir la ressource protégée
 * @param resource Nom de la ressource
 */
export const Resource = (resource: string) => SetMetadata('resource', resource);

/**
 * Décorateur pour définir les scopes requis pour accéder à une ressource
 * @param scopes Liste des scopes autorisés
 */
export const Scopes = (scopes: string[]) => SetMetadata('scopes', scopes);

/**
 * Décorateur pour marquer une route comme publique (sans authentification)
 */
export const Public = () => SetMetadata('isPublic', true);