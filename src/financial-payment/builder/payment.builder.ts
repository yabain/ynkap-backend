import { Injectable } from "@nestjs/common"
import { PaymentStrategyType } from "../enum";
import { PaymentMethodStrategy } from "../interfaces";
import { MtnMoneyStrategyPayment } from "../strategies/mtn-money";
import { OrangeMoneyStrategyPayment } from "../strategies/orange-money";

@Injectable()
export class PaymentBuilder
{
    
    constructor(
        private mtnMoneyStrategyPayment:MtnMoneyStrategyPayment,
        private orangeMoneyStrategyPayment:OrangeMoneyStrategyPayment
    ){}
    getMethodPayment(method:PaymentStrategyType):PaymentMethodStrategy
    {
        let paiementMethodStrategi:PaymentMethodStrategy;
        switch(method)
        {
            // case PaiementStrategyType.BANK:
            //     throw new PaymentException(PaymentException.UNSUPPORTED_BANK_PAYMENT_METHOD, "Bank payment method not supported")
            case PaymentStrategyType.MTN_MONEY:
                paiementMethodStrategi=this.mtnMoneyStrategyPayment;
                break
            case PaymentStrategyType.ORANGE_MONEY:
                paiementMethodStrategi=this.orangeMoneyStrategyPayment
                break
            
        }
        return paiementMethodStrategi
    }
}