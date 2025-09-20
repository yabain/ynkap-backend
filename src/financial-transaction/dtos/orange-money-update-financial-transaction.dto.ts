import { IsString } from "class-validator";

export class OrangeMoneyUpdateFinancialTransactionStatus
{
    @IsString()
    id:string;

    @IsString()
    createtime:string
    
    @IsString()
    subscriberMsisdn:string

    @IsString()
    amount:any;

    @IsString()
    payToken:string;

    @IsString()
    txnid:string;

    @IsString()
    txnmode:string;

    @IsString()
    inittxnmessage:string

    @IsString()
    inittxnstatus:string;

    @IsString()
    confirmtxnstatus:string;

    @IsString()
    confirmtxnmessage:string

    @IsString()
    status:string;

    @IsString()
    notifUrl:string;

    @IsString()
    description:string;

    @IsString()
    channelUserMsisdn:string
}