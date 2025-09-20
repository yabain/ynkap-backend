import { IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class MtnMoneyUpdateFinancialTransactionStatus {
    @IsString()
    @ApiProperty({ example: "REF1732873412564", description: "Reference ID of the transaction" })
    referenceId: string;

    @IsString()
    @ApiProperty({ example: "SUCCESSFUL", description: "Status of the transaction", enum: ["SUCCESSFUL", "FAILED", "PENDING"] })
    status: string;

    @IsString()
    @IsOptional()
    @ApiProperty({ example: "2024-11-29T09:46:29.877Z", description: "Transaction completion time", required: false })
    completionTime?: string;

    @IsString()
    @IsOptional()
    @ApiProperty({ example: "Payment successful", description: "Additional message about the transaction", required: false })
    message?: string;

    @IsString()
    @IsOptional()
    @ApiProperty({ example: "237698142912", description: "Phone number of the payer", required: false })
    payerPhone?: string;
}
