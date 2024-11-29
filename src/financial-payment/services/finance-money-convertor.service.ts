import { Injectable } from "@nestjs/common"
import { PaymentMoneyCode } from "../enum";

@Injectable()
export class FinanceMoneyConvertorService
{
    convertMoneyCodeToUnit(moneyCode:PaymentMoneyCode,amount:number):number
    {
        return amount;
    }

    convertUnitToMoneyCode(moneyCode:PaymentMoneyCode,amount:number):number
    {
        return amount
    }

    convertMoneyInto

}