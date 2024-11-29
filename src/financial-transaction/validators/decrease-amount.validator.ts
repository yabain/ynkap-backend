import { Inject, Injectable, Req } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { Request } from "express";
import { WalletService } from "src/wallet/services";

@ValidatorConstraint({name:'IsValidAmount',async:true})
@Injectable()
export class DecreaseAmountValidator implements ValidatorConstraintInterface
{
    constructor(
        @Inject(REQUEST) private readonly request: Request,
        private walletService:WalletService){}
    async validate(value: number, validationArguments?: ValidationArguments): Promise<boolean> {
        let appId=this.request.user["userId"];
        let wallet = await this.walletService.findOneByField({"application":appId});

        return wallet.amount>=value;
    }
    defaultMessage(validationArguments?: ValidationArguments): string {
        return `Wallet amount is less than transaction amount`
    }
}