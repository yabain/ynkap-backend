import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LogService } from '../services/log.service';
import { LogLevel } from '../enums/log-level.enum';
import { LogType } from '../enums/log-type.enum';

@Injectable()
export class ErrorLoggerInterceptor implements NestInterceptor {
  constructor(private readonly logService: LogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(error => {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        
        // Extraire les informations de la requête
        const { method, url, body, headers, query, params } = request;
        const user = request.user?.sub || 'anonymous';
        
        // Déterminer le niveau de log en fonction du statut HTTP
        let level = LogLevel.ERROR;
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        
        if (error instanceof HttpException) {
          status = error.getStatus();
          
          // Ajuster le niveau de log en fonction du statut HTTP
          if (status >= 400 && status < 500) {
            level = LogLevel.WARNING;
          }
        }
        
        // Créer le log d'erreur
        this.logService.create({
          level,
          type: LogType.API,
          message: `Erreur ${status}: ${error.message}`,
          user,
          metadata: {
            method,
            url,
            status,
            body,
            query,
            params,
            headers: this.sanitizeHeaders(headers),
            stack: error.stack,
          },
        });
        
        // Relancer l'erreur pour que NestJS puisse la gérer normalement
        return throwError(() => error);
      }),
    );
  }
  
  // Méthode pour nettoyer les en-têtes sensibles
  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };
    
    // Supprimer les informations sensibles
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}







