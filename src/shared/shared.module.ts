    import { Module } from "@nestjs/common";
    import { ConfigModule, ConfigService } from "@nestjs/config";
    import configuration from "./config/configuration";
    import { MongooseModule } from "@nestjs/mongoose";
    import { KeycloakModule } from "src/keycloak/keycloak.module";


    @Module({
        imports:[
            ConfigModule.forRoot({
                load: [configuration],
                envFilePath: process.env.NODE_ENV === 'prod' ? '.env.prod' : '.env.dev',
                isGlobal: true,
            }),

            MongooseModule.forRootAsync({
                imports:[ConfigModule],
                inject:[ConfigService],
                useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('mongoURI')
                // Suppression des options dépréciées
                // useNewUrlParser: true,
                // useUnifiedTopology: true,
                })
            }),
            KeycloakModule
        ],
        providers: [],
        exports: [
            KeycloakModule,
            MongooseModule,
            ConfigModule
        ],
    })
    export class SharedModule {

    }
