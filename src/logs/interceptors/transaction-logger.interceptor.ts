import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogService } from '../services/log.service';
import { LogLevel } from '../enums/log-level.enum';
import { LogType } from '../enums/log-type.enum';

// Décorateur pour marquer les méthodes de transaction à journaliser
export const LogTransaction = () => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('log_transaction', true, target, key);
    return descriptor;
  };
};

@Injectable()
export class TransactionLoggerInterceptor implements NestInterceptor {
  constructor(private readonly logService: LogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const user = request.user?.sub || 'anonymous';
    
    return next.handle().pipe(
      tap({
        next: (data) => {
          // Vérifier si la réponse contient des informations de transaction
          if (data && (data.transactionId || data._id)) {
            this.logService.create({
              level: LogLevel.INFO,
              type: LogType.TRANSACTION,
              message: `Transaction ${data.transactionId || data._id} effectuée avec succès`,
              user: user,
              metadata: {
                transactionId: data.transactionId || data._id,
                amount: data.amount,
                currency: data.currency,
                status: data.status || data.state,
                paymentMethod: data.paymentMethod || data.paymentMode,
                userId: user,
                applicationId: data.application,
                duration: Date.now() - now
              }
            });
          }
        },
        error: (error) => {
          // Créer un log pour une transaction échouée
          this.logService.create({
            level: LogLevel.ERROR,
            type: LogType.TRANSACTION,
            message: `Erreur lors de la transaction`,
            user: user,
            metadata: {
              error: error.message,
              request: request.body,
              duration: Date.now() - now
            }
          });
        }
      })
    );
  }
}