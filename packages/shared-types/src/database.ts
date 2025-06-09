export interface UserProfile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  preferences: {
    default_model: string;
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model_provider: string;
  model_name: string;
  system_prompt?: string;
  is_document_chat: boolean;
  document_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  model?: string;
  tokens_used: number;
  embedding?: number[];
  document_context?: any;
  metadata: Record<string, any>;
  created_at: string;
}

export interface File {
  id: string;
  conversation_id?: string;
  user_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_text?: string;
  chunk_count: number;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  file_id: string;
  chunk_index: number;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  created_at: string;
}

export interface GeneratedImage {
  id: string;
  user_id: string;
  conversation_id?: string;
  prompt: string;
  storage_path: string;
  model: string;
  parameters: Record<string, any>;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  resource_type: 'tokens' | 'images' | 'searches' | 'storage' | 'document_processing';
  amount: number;
  cost_cents: number;
  metadata: Record<string, any>;
  created_at: string;
}