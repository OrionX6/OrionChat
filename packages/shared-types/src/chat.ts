import { Message, Conversation } from './database';
import { LLMProvider } from './llm';

export interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error?: string;
}

export interface SendMessageRequest {
  content: string;
  conversationId?: string;
  fileId?: string;
  provider?: LLMProvider;
  model?: string;
}

export interface CreateConversationRequest {
  title?: string;
  provider?: LLMProvider;
  model?: string;
  systemPrompt?: string;
  isDocumentChat?: boolean;
  documentId?: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface ChatInput {
  value: string;
  files: File[];
  isGeneratingImage: boolean;
  isSearching: boolean;
}

export interface MessageWithFiles extends Message {
  files?: FileAttachment[];
  generatedImages?: GeneratedImageAttachment[];
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface GeneratedImageAttachment {
  id: string;
  prompt: string;
  url: string;
  model: string;
}