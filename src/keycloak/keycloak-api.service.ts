import { HttpService } from "@nestjs/axios";
import { Injectable, Req } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { lastValueFrom } from "rxjs";

@Injectable()
export class KeycloakApiService {
    private serviceAccountToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor(
        private http: HttpService,
        private configService: ConfigService
    ){}

    /**
     * Fetch a service account token using client credentials grant.
     * Caches the token until it expires.
     */
    private async getServiceAccountToken(): Promise<string> {
        const now = Math.floor(Date.now() / 1000);
        if (this.serviceAccountToken && this.tokenExpiresAt > now + 60) {
            return this.serviceAccountToken;
        }
        const tokenUrl = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/protocol/openid-connect/token`;
        const clientId = this.configService.get<string>('KEYCLOAK_SERVER_CLIENTID');
        const clientSecret = this.configService.get<string>('KEYCLOAK_SERVER_SECRET');
        const params = new URLSearchParams();
        // console.log(tokenUrl);
        // console.log(clientId);
        // console.log(clientSecret);
        params.append('grant_type', 'client_credentials');
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        const response = await lastValueFrom(
            this.http.post(tokenUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })
        );
        this.serviceAccountToken = response.data.access_token;
        this.tokenExpiresAt = now + response.data.expires_in;
        return this.serviceAccountToken;
    }

    /**
     * Get users by role using the service account token.
     */
    async getUsersByRole(roleName: string, _req: any): Promise<string[]> {
        // Query realm roles instead of client roles
        const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/roles/${roleName}/users`;
        const token = await this.getServiceAccountToken();
        const response = await lastValueFrom(
            this.http.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            })
        );
        return response.data.map(user => user.id);
    }

    /**
     * Get a user's role mappings (realm and client roles) using the Keycloak Admin REST API.
     */
    async getUserRoles(userId: string): Promise<any> {
        const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/users/${userId}/role-mappings`;
        const token = await this.getServiceAccountToken();
        const response = await lastValueFrom(
            this.http.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            })
        );
        return response.data; // Contains realmMappings and clientMappings
    }

    /**
     * Get user details by user ID using the Keycloak Admin REST API.
     */
    async getUserById(userId: string): Promise<any> {
        const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/users/${userId}`;
        const token = await this.getServiceAccountToken();
        const response = await lastValueFrom(
            this.http.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            })
        );
        return response.data;
    }

}

