import { HttpService } from "@nestjs/axios";
import { Injectable, Req } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { lastValueFrom, map, Observable } from "rxjs";

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

}

