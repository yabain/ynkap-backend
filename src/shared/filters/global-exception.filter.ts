import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Response } from 'express'

@Catch() 
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);
    
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        
        // Vérifier si la réponse a déjà été envoyée
        if (response.headersSent) {
            this.logger.error('Headers already sent, cannot send error response:', exception);
            return;
        }

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'Internal Server Error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            
            if (typeof exceptionResponse === 'object') {
                message = (exceptionResponse as any).message || message;
                error = (exceptionResponse as any).error || error;
            } else {
                message = exceptionResponse;
            }
        } else if (exception instanceof Error) {
            message = exception.message;
            error = exception.name;
            
            // Log détaillé pour les erreurs non HTTP
            this.logger.error(`Unhandled exception: ${error}: ${message}`, exception.stack);
        }

        // Log de l'erreur avec des informations sur la requête
        this.logger.error(`Exception ${status} on ${request.method} ${request.url}: ${message}`);

        response.status(status).json({
            statusCode: status,
            error: error,
            message: Array.isArray(message) ? message : [message],
            timestamp: new Date().toISOString(),
            path: request.url
        });
    }
}
