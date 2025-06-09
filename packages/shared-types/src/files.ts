export interface FileUploadRequest {
  file: File;
  conversationId?: string;
}

export interface FileUploadResponse {
  success: boolean;
  file?: {
    id: string;
    name: string;
    path: string;
    size: number;
    type: string;
  };
  error?: string;
}

export interface FileProcessingStatus {
  fileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  extractedText?: string;
  chunkCount?: number;
}

export interface PDFProcessingResult {
  fileId: string;
  extractedText: string;
  chunks: DocumentChunkData[];
}

export interface DocumentChunkData {
  content: string;
  embedding: number[];
  metadata: {
    page?: number;
    section?: string;
    [key: string]: any;
  };
}

export interface FilePreview {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  isProcessing: boolean;
  canPreview: boolean;
}

export const SUPPORTED_FILE_TYPES = {
  PDF: 'application/pdf',
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_PNG: 'image/png',
  IMAGE_WEBP: 'image/webp',
  IMAGE_GIF: 'image/gif',
} as const;

export const MAX_FILE_SIZES = {
  PDF: 30 * 1024 * 1024, // 30MB
  IMAGE: 10 * 1024 * 1024, // 10MB
} as const;