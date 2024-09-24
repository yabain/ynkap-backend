import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUrl, MinLength } from "class-validator";

export class UpdateApplicationDTO {
    
    @ApiProperty({
        description: "Name of the application the logged-in user wishes to create",
        example: "Yabi",
        required:true,
        minLength: 4
    })
    @IsString()
    @MinLength(4)
    name: string;

    @ApiProperty({
        description: "URL for sending transaction status notifications to the application created",
        example: "http://yabi.com",
        required:true,
        format: 'url'
    })
    @IsUrl()
    urlToCallback: string
}