import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogService } from '../services/log.service';
import { LogLevel } from '../enums/log-level.enum';
import { LogType } from '../enums/log-type.enum';
import { Reflector } from '@nestjs/core';

// Décorateur pour marquer les méthodes à journaliser
export const LogActivity = (message: string, type: LogType = LogType.ACTIVITY) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('log_activity_message', message, target, key);
    Reflect.defineMetadata('log_activity_type', type, target, key);
    return descriptor;
  };
};

@Injectable()
export class ActivityLoggerInterceptor implements NestInterceptor {
  constructor(
    private readonly logService: LogService,
    private readonly reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const user = request?.user?.sub || 'anonymous';
    
    // Récupérer les métadonnées du décorateur
    const handler = context.getHandler();
    const logMessage = this.reflector.get<string>('log_activity_message', handler);
    const logType = this.reflector.get<LogType>('log_activity_type', handler) || LogType.ACTIVITY;
    
    // Si aucun message n'est défini, utiliser un message par défaut
    const message = logMessage || `${method} ${url}`;
    
    // Récupérer le nom du module
    const className = context.getClass().name;
    const moduleName = className.replace('Controller', '');
    
    return next.handle().pipe(
      tap({
        next: (data) => {
          // Créer un log pour une action réussie
          this.logService.create({
            level: LogLevel.INFO,
            type: logType,
            message: message,
            user: user,
            metadata: {
              module: moduleName,
              method: method,
              url: url,
              duration: Date.now() - now,
              response: data
            }
          });
        },
        error: (error) => {
          // Créer un log pour une action échouée
          this.logService.create({
            level: LogLevel.ERROR,
            type: logType,
            message: `Erreur: ${message}`,
            user: user,
            metadata: {
              module: moduleName,
              method: method,
              url: url,
              duration: Date.now() - now,
              error: error.message,
              stack: error.stack
            }
          });
        }
      })
    );
  }
}
