import { FAQ } from '../models/faq.schema';

// Pagination Result Interface
export interface PaginatedFAQResult {
    items: FAQ[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

// FAQ Suggestion Interface
export interface FAQSuggestion {
    faq: FAQ;
    relevanceScore: number;
    matchedFields: string[];
}

// FAQ Statistics Interface
export interface FAQStatistics {
    totalFAQs: number;
    activeFAQs: number;
    inactiveFAQs: number;
    totalViews: number;
    averageViews: number;
    topTags: { tag: string; count: number }[];
}

// Batch Operation Response Interface
export interface BatchOperationResponse {
    message: string;
    updated: number;
}