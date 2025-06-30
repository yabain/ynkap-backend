import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LogSizeLimiterInterceptor implements NestInterceptor {
  /**
   * Limite la taille d'un objet pour éviter de dépasser la limite BSON de MongoDB
   * @param obj Objet à limiter
   * @param maxSize Taille maximale en caractères pour les chaînes
   * @param depth Profondeur actuelle de récursion
   * @param maxDepth Profondeur maximale de récursion
   * @returns Objet limité en taille
   */
  private limitObjectSize(obj: any, maxSize = 10000, depth = 0, maxDepth = 5): any {
    if (depth > maxDepth) {
      return '[Objet trop profond]';
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      if (obj.length > maxSize) {
        return obj.substring(0, maxSize) + '... [tronqué]';
      }
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      // Limiter la taille du tableau à 1000 éléments
      const limitedArray = obj.slice(0, 1000).map(item => 
        this.limitObjectSize(item, maxSize, depth + 1, maxDepth)
      );
      
      if (obj.length > 1000) {
        limitedArray.push(`... [${obj.length - 1000} éléments supplémentaires tronqués]`);
      }
      
      return limitedArray;
    }

    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this.limitObjectSize(obj[key], maxSize, depth + 1, maxDepth);
      }
    }
    return result;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Limiter la taille du corps de la requête pour les routes de logs
    if (request.path.includes('/logs') && request.method === 'POST' && request.body) {
      // Limiter la taille du message
      if (request.body.message && request.body.message.length > 10000) {
        request.body.message = request.body.message.substring(0, 10000) + '... [tronqué]';
      }
      
      // Limiter la taille des métadonnées
      if (request.body.metadata) {
        request.body.metadata = this.limitObjectSize(request.body.metadata);
      }
    }
    
    return next.handle();
  }
}