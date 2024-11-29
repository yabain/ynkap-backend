import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UserRefDTO
{
    
    @ApiProperty({
        description: "Full name of person initiating payment claim",
        example: "Cédric Nguendap",
        required:true
    })
    @IsString()
    fullName:String;

    @ApiProperty({
        description: "Account number of the person initiating payment claim",
        example: "698295368",
        required:true
    })
    @IsString()
    account: String | Record<string,any>
}