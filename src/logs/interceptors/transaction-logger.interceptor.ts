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
          if (data && (data.transactionId || data._id)) {
            // Déterminer le type d'opération
            let operationType = 'TRANSACTION';
            if (data.type) {
              switch (data.type.toLowerCase()) {
                case 'deposit':
                case 'depot':
                  operationType = 'DEPOT';
                  break;
                case 'withdrawal':
                case 'retrait':
                  operationType = 'RETRAIT';
                  break;
                case 'transfer':
                case 'transfert':
                  operationType = 'TRANSFERT';
                  break;
                case 'payment':
                case 'paiement':
                  operationType = 'PAIEMENT';
                  break;
              }
            }
            
            this.logService.create({
              level: LogLevel.INFO,
              type: LogType.TRANSACTION,
              message: `${operationType} ${data.transactionId || data._id} effectué avec succès`,
              user: user,
              metadata: {
                transactionId: data.transactionId || data._id,
                operationType: operationType,
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
