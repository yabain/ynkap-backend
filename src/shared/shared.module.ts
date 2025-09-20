import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import configuration from "./config/configuration";
import { MongooseModule } from "@nestjs/mongoose";
import { KeycloakModule } from "src/keycloak/keycloak.module";
import { RecaptchaService } from "./services/recaptcha.service";


@Module({
    imports:[
        ConfigModule.forRoot({
            load: [configuration],
            envFilePath: process.env.NODE_ENV === 'prod' ? '.env.prod' : '.env.dev', // determine le fichier .env à charger en fonction de la valeur de la variable d'environement 'NODE_ENV'
            isGlobal: true,
          }),

        MongooseModule.forRootAsync({
            imports:[ConfigModule],
            inject:[ConfigService],
            useFactory: async (configService: ConfigService) => ({
              uri: configService.get<string>('mongoURI')
            })
        }),
        KeycloakModule
    ],
    providers: [RecaptchaService],
    exports: [
        KeycloakModule,
        MongooseModule,
        ConfigModule,
        RecaptchaService
    ],
})
export class SharedModule {

}