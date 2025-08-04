import { ExecutionContext, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class AuthJwtGuard extends AuthGuard("jwt") {
    handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
        if (err || !user) {
            let errorMessage = 'Authentication failed';
            
            if (info?.name === 'TokenExpiredError') {
                errorMessage = 'Token has expired';
            } else if (info?.name === 'JsonWebTokenError') {
                errorMessage = 'Invalid token';
            } else if (info?.message) {
                errorMessage = info.message;
            }

            throw err || new UnauthorizedException({
                statusCode: HttpStatus.UNAUTHORIZED,
                error: 'Authentication error',
                message: [errorMessage],
                timestamp: new Date().toISOString()
            });
        }

        // Vérifier les permissions si nécessaire
        const request = context.switchToHttp().getRequest();
        const requiredPermissions = this.getRequiredPermissions(request);
        
        if (requiredPermissions && !this.hasPermissions(user, requiredPermissions)) {
            throw new UnauthorizedException({
                statusCode: HttpStatus.FORBIDDEN,
                error: 'Insufficient permissions',
                message: ['Access denied: insufficient permissions'],
                timestamp: new Date().toISOString()
            });
        }

        return user;
    }

    private getRequiredPermissions(request: any): string[] | null {
        // Logique pour déterminer les permissions requises selon la route
        const path = request.route?.path || request.url;
        
        if (path.includes('/payments')) return ['payments'];
        if (path.includes('/wallet')) return ['wallet'];
        if (path.includes('/messages')) return ['messages'];
        
        return null;
    }

    private hasPermissions(user: any, requiredPermissions: string[]): boolean {
        if (!user.permissions) return false;
        
        return requiredPermissions.every(permission => 
            user.permissions[permission] === true
        );
    }
}
