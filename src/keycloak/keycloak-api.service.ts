import { HttpService } from "@nestjs/axios";
import { Injectable, Req } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { lastValueFrom } from "rxjs";

@Injectable()
export class KeycloakApiService {
    constructor(
        private http: HttpService,
        private configService: ConfigService
    ){}

    async getUsersByRole(roleName: string, req: any): Promise<string[]>{
        const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/clients/${this.configService.get<string>('KEYCLOAK_CLIENT_UUID')}/roles/${roleName}/users`
        const response = await lastValueFrom(
            this.http.get(url,
            {
                headers: {Authorization: `Bearer ${req['accessTokenJWT']}`}
            }))
        return response.data.map(user => user.id)
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
    async getAllUsers(req: any, params: { first?: number, max?: number } = {}): Promise<any[]> {
        const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/users`;
        const response = await lastValueFrom(
            this.http.get(url, {
                headers: { Authorization: `Bearer ${req['accessTokenJWT']}` },
                params
            })
        );
        return response.data;
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
