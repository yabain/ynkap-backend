import { registerDecorator, ValidationOptions } from "class-validator"
import { DecreaseAmountValidator } from "../validators"

export function IsValidAmount<T>(validationOption?:ValidationOptions):(object:T, propertyName:string)=>void 
{
    return (object: T, propertyName:string):void =>{
        registerDecorator({
            name:'IsValidAmount',
            target:object.constructor,
            propertyName,
            constraints:[],
            options: validationOption,
            validator: DecreaseAmountValidator
        })
    }
}