import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUrl, MinLength } from "class-validator";

export class UpdateApplicationDTOS {
    
    @ApiProperty({
        description: "Nom de l'application que l'utilsateur connecté souhaite créer",
        example: "Yabi",
        required:true,
        minLength: 4
    })
    @IsString()
    @MinLength(4)
    name: string;

    @ApiProperty({
        description: "URL pour l'envoie des notifications sur l'état d'une transaction vers l'application crée",
        example: "http://yabi.com",
        required:true,
        format: 'url'
    })
    @IsUrl()
    urlToCallback: string
}