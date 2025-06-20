export interface MultimodalContent {
  type: 'text' | 'image' | 'file_uri' | 'file_id';
  text?: string;
  image?: {
    url?: string;
    base64?: string;
    mimeType?: string;
  };
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
  file_uri?: string;
  file_id?: string;
  mime_type?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | MultimodalContent[];
  metadata?: Record<string, any>;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: TokenUsage;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface StreamOptions {
  maxTokens?: number;
  temperature?: number;
  functions?: any[];
  userId?: string;
  conversationId?: string;
}

export interface CostOptimizedProvider {
  name: string;
  models: string[];
  costPerToken: { input: number; output: number }; // in cents per 1k tokens
  maxTokens: number;
  stream(messages: ChatMessage[], options: StreamOptions): AsyncIterable<StreamChunk>;
  embed(text: string): Promise<number[]>;
  supportsFunctions: boolean;
}

export interface LLMProviderConfig {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'deepseek';

export interface ModelInfo {
  provider: LLMProvider;
  name: string;
  displayName: string;
  inputCostPer1K: number;
  outputCostPer1K: number;
  maxTokens: number;
  supportsFunctions: boolean;
  supportsVision: boolean;
}