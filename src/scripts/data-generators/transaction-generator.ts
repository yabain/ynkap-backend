import { FinancialTransactionState } from "../../financial-transaction/enum";
import { FinancialTransactionType, PaymentMoneyCode, PaymentStrategyType } from "../../financial-payment/enum";
import { UtilsFunc } from "../../financial-transaction/utils/utils-func";
import mongoose from "mongoose";

export class TransactionGenerator {
  private phoneNumbers = ['237671162552', '237698295368', '237699887766', '237655443322'];
  private userNames = ['John Doe', 'Jane Smith', 'Robert Johnson', 'Emily Davis'];
  private reasons = [
    'Paiement de frais de scolarité',
    'Achat de crédit',
    'Paiement de facture',
    'Transfert d\'argent',
    'Abonnement mensuel',
    'Donation'
  ];
  private paymentModes = [
    PaymentStrategyType.ORANGE_MONEY,
    PaymentStrategyType.MTN_MONEY,
    PaymentStrategyType.BANK
  ];
  private transactionStates = [
    FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS,
    FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
    FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING
  ];
  private transactionTypes = [
    FinancialTransactionType.DEPOSIT,
    FinancialTransactionType.WITHDRAW
  ];

  // Période par défaut: 6 derniers mois
  private startDate: Date;
  private endDate: Date;

  constructor(startMonthsAgo = 6) {
    this.endDate = new Date();
    this.startDate = new Date();
    this.startDate.setMonth(this.startDate.getMonth() - startMonthsAgo);
  }

  private randomDate(): Date {
    return new Date(this.startDate.getTime() + Math.random() * (this.endDate.getTime() - this.startDate.getTime()));
  }

  private randomAmount(min = 1000, max = 50000): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Génère une transaction aléatoire pour une application et un portefeuille donnés
  generateTransaction(applicationId: mongoose.Types.ObjectId | string, walletId: mongoose.Types.ObjectId | string) {
    const transactionDate = this.randomDate();
    const phoneNumber = this.randomChoice(this.phoneNumbers);
    const userName = this.randomChoice(this.userNames);
    const reason = this.randomChoice(this.reasons);
    const paymentMode = this.randomChoice(this.paymentModes);
    const state = this.randomChoice(this.transactionStates);
    const type = this.randomChoice(this.transactionTypes);
    const amount = this.randomAmount();

    // Convertir les IDs en ObjectId si nécessaire
    const appId = typeof applicationId === 'string' ? new mongoose.Types.ObjectId(applicationId) : applicationId;
    const wId = typeof walletId === 'string' ? new mongoose.Types.ObjectId(walletId) : walletId;

    return {
      state,
      startDate: transactionDate,
      endDate: transactionDate,
      amount,
      raison: reason,
      type,
      ref: UtilsFunc.generateUniqueRef(),
      token: '',
      error: 0,
      paymentMode,
      application: appId,
      moneyCode: PaymentMoneyCode.XAF,
      userRef: {
        fullName: userName,
        account: phoneNumber
      },
      wallet: wId,
      createdAt: transactionDate,
      phoneNumber,
      description: reason
    };
  }

  // Génère un nombre spécifié de transactions pour une application et un portefeuille
  generateTransactions(applicationId: mongoose.Types.ObjectId | string, walletId: mongoose.Types.ObjectId | string, count: number) {
    const transactions = [];
    for (let i = 0; i < count; i++) {
      transactions.push(this.generateTransaction(applicationId, walletId));
    }
    return transactions;
  }
}
