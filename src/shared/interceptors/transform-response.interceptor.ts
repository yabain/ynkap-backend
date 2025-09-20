import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CUSTOM_MESSAGE_KEY } from '../decorators/custom-message.decorator';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp?: string;
}

@Injectable()
export class TransformResponeInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const customMessage = this.reflector.get<string>(
      CUSTOM_MESSAGE_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map(data => ({
        statusCode: context.switchToHttp().getResponse().statusCode,
        message: customMessage || 'Opération réussie',
        data,
        timestamp: new Date().toISOString()
      })),
    );
  }
}
