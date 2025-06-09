import { LLMProvider } from './llm';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface ChatStreamRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  conversationId?: string;
  provider: LLMProvider;
  model: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

export interface SearchRequest {
  query: string;
  maxResults?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  timestamp: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  style?: string;
  conversationId?: string;
  parameters?: {
    width?: number;
    height?: number;
    steps?: number;
    guidance?: number;
  };
}

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  prompt: string;
  parameters?: Record<string, any>;
  error?: string;
}

export interface UsageStatsRequest {
  startDate?: string;
  endDate?: string;
  resourceType?: 'tokens' | 'images' | 'searches' | 'storage' | 'document_processing';
}

export interface UsageStatsResponse {
  totalTokens: number;
  totalImages: number;
  totalSearches: number;
  totalCostCents: number;
  breakdown: {
    provider: string;
    tokens: number;
    costCents: number;
  }[];
  period: {
    start: string;
    end: string;
  };
}