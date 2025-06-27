import { HttpService } from "@nestjs/axios";
import { Injectable, Req, NotFoundException, ServiceUnavailableException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { lastValueFrom, catchError, throwError } from "rxjs";
import { AxiosError } from "axios";

@Injectable()
export class KeycloakApiService {
    constructor(
        private http: HttpService,
        private configService: ConfigService
    ){}

    private handleKeycloakError(error: AxiosError, operation: string): never {
        console.error(`Keycloak ${operation} error:`, error.response?.status, error.response?.data);
        
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    throw new UnauthorizedException(`Authentication failed when ${operation}`);
                case 403:
                    throw new UnauthorizedException(`Insufficient permissions when ${operation}`);
                case 404:
                    throw new NotFoundException(`Resource not found when ${operation}`);
                case 400:
                    throw new BadRequestException(`Invalid request when ${operation}: ${JSON.stringify(error.response.data)}`);
                case 500:
                case 502:
                case 503:
                    throw new ServiceUnavailableException(`Keycloak service unavailable when ${operation}`);
                default:
                    throw new ServiceUnavailableException(`Unexpected error when ${operation}`);
            }
        }
        
        throw new ServiceUnavailableException(`Network error when ${operation}`);
    }

    async getUsersByRole(roleName: string, req: any): Promise<string[]> {
        const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/clients/${this.configService.get<string>('KEYCLOAK_CLIENT_UUID')}/roles/${roleName}/users`;
        
        try {
            const response = await lastValueFrom(
                this.http.get(url, {
                    headers: { Authorization: `Bearer ${req['accessTokenJWT']}` }
                }).pipe(
                    catchError((error: AxiosError) => {
                        return throwError(() => this.handleKeycloakError(error, `getting users by role ${roleName}`));
                    })
                )
            );
            return response.data.map(user => user.id);
        } catch (error) {
            if (error instanceof UnauthorizedException || 
                error instanceof NotFoundException || 
                error instanceof BadRequestException ||
                error instanceof ServiceUnavailableException) {
                throw error;
            }
            throw new ServiceUnavailableException(`Failed to get users by role: ${error.message}`);
        }
    }

    // Récupérer les informations d'un utilisateur par son ID
    async getUserById(userId: string, req: any): Promise<any> {
        const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/users/${userId}`;
        const response = await lastValueFrom(
            this.http.get(url, {
                headers: { Authorization: `Bearer ${req['accessTokenJWT']}` }
            })
        );
        return response.data;
    }

    // Récupérer tous les utilisateurs
    async getAllUsers(req: any, params: { 
        first?: number, 
        max?: number,
        search?: string,
        email?: string,
        username?: string,
        firstName?: string,
        lastName?: string,
        exact?: boolean
    } = {}): Promise<any[]> {
        const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/users`;
        
        try {
            const response = await lastValueFrom(
                this.http.get(url, {
                    headers: { Authorization: `Bearer ${req['accessTokenJWT']}` },
                    params
                }).pipe(
                    catchError((error: AxiosError) => {
                        return throwError(() => this.handleKeycloakError(error, 'getting all users'));
                    })
                )
            );
            return response.data;
        } catch (error) {
            if (error instanceof UnauthorizedException || 
                error instanceof NotFoundException || 
                error instanceof BadRequestException ||
                error instanceof ServiceUnavailableException) {
                throw error;
            }
            throw new ServiceUnavailableException(`Failed to get users: ${error.message}`);
        }
    }

    // Activer un compte utilisateur
    async enableUserAccount(userId: string, req: any): Promise<void> {
        const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/users/${userId}`;
        
        // D'abord, récupérer les informations actuelles de l'utilisateur
        const user = await this.getUserById(userId, req);
        
        // Mettre à jour le statut du compte
        await lastValueFrom(
            this.http.put(url, 
                { ...user, enabled: true },
                {
                    headers: { 
                        Authorization: `Bearer ${req['accessTokenJWT']}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
        );
    }

    // Désactiver un compte utilisateur
    async disableUserAccount(userId: string, req: any): Promise<void> {
        const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/users/${userId}`;
        
        // D'abord, récupérer les informations actuelles de l'utilisateur
        const user = await this.getUserById(userId, req);
        
        // Mettre à jour le statut du compte
        await lastValueFrom(
            this.http.put(url, 
                { ...user, enabled: false },
                {
                    headers: { 
                        Authorization: `Bearer ${req['accessTokenJWT']}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
        );
    }

    // Récupérer l'historique des événements d'un utilisateur
    async getUserEvents(userId: string, req: any, params: { max?: number } = { max: 10 }): Promise<any[]> {
        const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/events`;
        const response = await lastValueFrom(
            this.http.get(url, {
                headers: { Authorization: `Bearer ${req['accessTokenJWT']}` },
                params: {
                    ...params,
                    user: userId
                }
            })
        );
        return response.data;
    }
}
