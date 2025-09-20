import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LogService } from '../services/log.service';
import { LogLevel } from '../enums/log-level.enum';
import { LogType } from '../enums/log-type.enum';

@Injectable()
export class ActivityLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logService: LogService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Capturer l'heure de début
    const startTime = Date.now();
    const originalUrl = req.originalUrl;
    const method = req.method;
    const userAgent = req.get('user-agent') || 'unknown';
    const ip = req.ip || req.socket.remoteAddress;
    
    // Stocker l'utilisateur si authentifié
    const user = req.user ? (req.user as any).sub : 'anonymous';
    
    // Capturer une référence au service de journalisation
    const logService = this.logService;

    // Intercepter la méthode end pour capturer la réponse
    const originalEnd = res.end;
    
    res.end = function(...args) {
      // Calculer la durée
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Déterminer le niveau de log en fonction du statut
      let level = LogLevel.INFO;
      if (statusCode >= 400 && statusCode < 500) {
        // Utiliser ERROR au lieu de WARN si WARN n'existe pas
        level = LogLevel.ERROR;
      } else if (statusCode >= 500) {
        level = LogLevel.ERROR;
      }
      
      // Créer un message de log
      const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;
      
      // Créer les métadonnées
      const metadata = {
        method,
        url: originalUrl,
        statusCode,
        duration,
        userAgent,
        ip
      };
      
      // Vérifier si le service est disponible avant d'appeler create
      if (logService && typeof logService.create === 'function') {
        // Enregistrer l'activité de manière asynchrone
        logService.create({
          level,
          type: LogType.ACTIVITY,
          message,
          user,
          metadata
        }).catch(err => {
          console.error('Failed to log activity:', err);
        });
      } else {
        console.warn('LogService not available for activity logging');
      }
      
      // Appeler la méthode originale
      return originalEnd.apply(this, args);
    };
    
    next();
  }
}







