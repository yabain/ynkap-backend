import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from 'express'

@Catch() 
//On ne spécifie pas de paramètre donc elle interceptera toutes les exceptions
export class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
    // La méthode catch traite l'exception interceptée, 
    // 'unknown' pour que des vérifications soient faites avant de manipuler l'objet 'exception'
    // 'host' fournit un contexte d'execution permettant d'accéder aux détails spécifiques à l'environement dans lequel l'exeption s'est produite

        const ctx = host.switchToHttp();
        //Convertit le contexte global en un contexte HTTP pour accéder aux objets spécifiques à ce protocole (ex: requête, response)
        const response = ctx.getResponse<Response>();
       
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'An internal error has occurred';
        let data = null;

        if(exception instanceof HttpException) {
            status = exception.getStatus()
            const exceptionResponse = exception.getResponse();
            message = typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any).message || message;
        }

        response.status(status).json({
            statusCode: status,
            message: message,
            data: data,
            timestamp: new Date().toISOString()
       })
    }
}