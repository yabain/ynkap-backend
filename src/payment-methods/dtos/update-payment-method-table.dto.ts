import { Transform } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsMongoId, IsString } from "class-validator";
import { isValidObjectId } from "mongoose";

export class UpdatePaymentMethodTableDTO {

    @IsArray()
    @ArrayNotEmpty()
    @IsString({each: true})
    @IsMongoId({each: true})
    paymentMethods: string[];
}