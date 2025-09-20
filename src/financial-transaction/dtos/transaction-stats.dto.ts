import { ApiProperty } from "@nestjs/swagger";

export class TransactionStatsDTO {
    @ApiProperty({ example: 10 })
    totalTransactions: number;

    @ApiProperty({ example: 5000 })
    totalAmount: number;

    @ApiProperty({ example: 80 })
    successRate: number;

    @ApiProperty({ example: 8 })
    successfulTransactions: number;

    @ApiProperty({ example: 1 })
    pendingTransactions: number;

    @ApiProperty({ example: 1 })
    failedTransactions: number;

    @ApiProperty({ example: 7 })
    deposits: number;

    @ApiProperty({ example: 3 })
    withdrawals: number;

    @ApiProperty({ example: 3500 })
    depositAmount: number;

    @ApiProperty({ example: 1500 })
    withdrawalAmount: number;
}