import { Transform } from "class-transformer";
import { IsEnum, IsString, IsUrl, MinLength } from "class-validator";
import { PaymentMethodsTypes } from "../enums/payment-methods-type.enum";

export class CreatePaymentMethodDTO {

    @IsString()
    @MinLength(3)
    @Transform(({value}) => value.toUpperCase())
    name: string;

    @IsUrl()
    logo: string;
    
    @Transform(({value}) => value.toUpperCase())
    @IsEnum(PaymentMethodsTypes)
    type: PaymentMethodsTypes;
   
}