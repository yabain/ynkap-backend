import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { map, Observable } from "rxjs";


@Injectable()
export class TransformResponeInterceptor implements NestInterceptor {
    constructor(private reflector: Reflector){}

    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        const customMessage = this.reflector.get<string>('customMessage', context.getHandler());

        return next.handle().pipe(
            map(data => ({
                statusCode: context.switchToHttp().getResponse().statusCode,
                message: customMessage || 'Opération réussie',
                data: data || null,
            }))
        )
    }
}