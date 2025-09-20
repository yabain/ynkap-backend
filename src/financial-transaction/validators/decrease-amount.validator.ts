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
        let appId=this.request?.user?.["userId"];
        
        // Vérifier si walletService est défini et si appId existe
        if (!this.walletService || !appId) {
            return true; // Permettre la validation si pas d'authentification (endpoint public)
        }
        
        let wallet = await this.walletService.findOneByField({"application":appId});
        
        // Vérifier si le wallet existe
        if (!wallet) {
            return true; // Permettre la validation si pas de wallet trouvé
        }

        return wallet.amount>=value;
    }
    defaultMessage(validationArguments?: ValidationArguments): string {
        return `Wallet amount is less than transaction amount`
    }
}