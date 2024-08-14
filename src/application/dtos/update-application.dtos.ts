import { IsString, IsUrl, MinLength } from "class-validator";

export class UpdateApplicationDTOS {
    
    @IsString()
    @MinLength(4)
    name: string;

    @IsUrl()
    urlToCallback: string
}