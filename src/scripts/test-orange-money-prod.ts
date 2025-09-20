import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PaymentService } from '../financial-transaction/services';
import { CreateFinancialTransactionDTO } from '../financial-transaction/dtos';
import { FinancialTransactionType, PaymentStrategyType, PaymentMoneyCode } from '../financial-payment/enum';

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const paymentService = app.get(PaymentService);

    const dto: CreateFinancialTransactionDTO = {
        appID: '684466a3d3cf5cafad0a7186',
        amount: 10,
        type: FinancialTransactionType.DEPOSIT,
        paymentMode: PaymentStrategyType.ORANGE_MONEY,
        moneyCode: PaymentMoneyCode.XAF,
        userRef: { fullName: 'ulrich Waba', account: '659396163' },
        raison: 'Paiement de frais de scolarité',
        phoneNumber: '659396163',
        description: 'Paiement Orange Money',
    };

    try {
        const result = await paymentService.makePayment(dto);
        console.log('Résultat du paiement Orange Money:', result);
    } catch (error) {
        console.error('Erreur lors du paiement Orange Money:', error);
    } finally {
        await app.close();
    }
}

main();