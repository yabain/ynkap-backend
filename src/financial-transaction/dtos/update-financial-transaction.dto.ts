import { PartialType } from "@nestjs/mapped-types";
import { CreateFinancialTransactionDTO } from "./create-financial-transaction.dto";

export class UpdateFinancialTransactionDTO extends PartialType(CreateFinancialTransactionDTO){}
