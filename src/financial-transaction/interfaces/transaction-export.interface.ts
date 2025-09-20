export interface TransactionExportOptions {
    format: 'csv' | 'excel' | 'pdf';
    appID: string;
    startDate?: string;
    endDate?: string;
    includeHeaders?: boolean;
    fileName?: string;
}
