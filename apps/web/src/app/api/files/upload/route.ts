import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_PDF_TYPES = ['application/pdf'];
const MAX_FILE_SIZE = {
  image: 10 * 1024 * 1024, // 10MB
  pdf: 30 * 1024 * 1024,   // 30MB
};

interface FileUploadResponse {
  id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_text?: string;
  preview_url?: string;
}

async function uploadPDFToGemini(buffer: ArrayBuffer, fileName: string): Promise<string> {
  try {
    console.log(`📄 Uploading PDF to Gemini Files API: ${fileName} (${buffer.byteLength} bytes)`);

    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
    }

    const fileManager = new GoogleAIFileManager(process.env.GOOGLE_AI_API_KEY);

    // Convert ArrayBuffer to Buffer for the upload
    const fileBuffer = Buffer.from(buffer);

    // Create a temporary file-like object for the upload
    const uploadResult = await fileManager.uploadFile(fileBuffer, {
      mimeType: 'application/pdf',
      displayName: fileName
    });

    console.log('✅ PDF uploaded to Gemini successfully:', uploadResult.file.uri);

    return uploadResult.file.uri;
  } catch (error) {
    console.error('❌ PDF upload to Gemini failed:', error);
    throw new Error(`Failed to upload PDF to Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function uploadPDFToAnthropic(buffer: ArrayBuffer, fileName: string): Promise<string> {
  try {
    console.log(`📄 Uploading PDF to Anthropic Files API: ${fileName} (${buffer.byteLength} bytes)`);

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Convert ArrayBuffer to File for the upload
    const fileBuffer = Buffer.from(buffer);
    const file = new File([fileBuffer], fileName, { type: 'application/pdf' });

    // Upload file to Anthropic Files API
    const uploadResult = await anthropic.beta.files.upload({
      file: file,
      betas: ['files-api-2025-04-14']
    });

    console.log('✅ PDF uploaded to Anthropic successfully:', uploadResult.id);

    return uploadResult.id;
  } catch (error) {
    console.error('❌ PDF upload to Anthropic failed:', error);
    throw new Error(`Failed to upload PDF to Anthropic: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function uploadPDFToOpenAI(buffer: ArrayBuffer, fileName: string): Promise<string> {
  try {
    console.log(`📄 Uploading PDF to OpenAI Files API: ${fileName} (${buffer.byteLength} bytes)`);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Convert ArrayBuffer to File for the upload
    const fileBuffer = Buffer.from(buffer);
    const file = new File([fileBuffer], fileName, { type: 'application/pdf' });

    // Upload file to OpenAI Files API with user_data purpose
    const uploadResult = await openai.files.create({
      file: file,
      purpose: 'user_data'
    });

    console.log('✅ PDF uploaded to OpenAI successfully:', uploadResult.id);

    return uploadResult.id;
  } catch (error) {
    console.error('❌ PDF upload to OpenAI failed:', error);
    throw new Error(`Failed to upload PDF to OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }
    if (!user) {
      console.error('No user found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('User authenticated:', user.id);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type and size
    const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
    const isPdf = SUPPORTED_PDF_TYPES.includes(file.type);

    if (!isImage && !isPdf) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Only images (JPEG, PNG, GIF, WebP) and PDFs are supported.' 
      }, { status: 400 });
    }

    const maxSize = isImage ? MAX_FILE_SIZE.image : MAX_FILE_SIZE.pdf;
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSizeMB}MB for ${isImage ? 'images' : 'PDFs'}.`
      }, { status: 400 });
    }

    // Validate conversation exists and belongs to user
    if (conversationId) {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (convError || !conversation) {
        return NextResponse.json({ error: 'Invalid conversation' }, { status: 400 });
      }
    }

    // Generate unique file path
    const fileId = uuidv4();
    const fileExtension = file.name.split('.').pop();
    const bucketName = isImage ? 'images' : 'attachments';
    const storagePath = `${user.id}/${fileId}.${fileExtension}`;

    // Convert file to buffer for processing
    const buffer = await file.arrayBuffer();

    // Process file based on type
    let extractedText: string | undefined;
    let geminiFileUri: string | undefined;
    let anthropicFileId: string | undefined;
    let openaiFileId: string | undefined;
    let processingStatus: 'completed' | 'failed' = 'completed';

    try {
      if (isPdf) {
        console.log('🔍 PDF detected, uploading to AI provider APIs...');

        // Upload to Gemini Files API
        try {
          geminiFileUri = await uploadPDFToGemini(buffer, file.name);
          console.log('✅ PDF uploaded to Gemini successfully. URI:', geminiFileUri);
        } catch (error) {
          console.error('❌ Gemini upload failed:', error);
        }

        // Upload to Anthropic Files API
        try {
          anthropicFileId = await uploadPDFToAnthropic(buffer, file.name);
          console.log('✅ PDF uploaded to Anthropic successfully. ID:', anthropicFileId);
        } catch (error) {
          console.error('❌ Anthropic upload failed:', error);
        }

        // Upload to OpenAI Files API
        try {
          openaiFileId = await uploadPDFToOpenAI(buffer, file.name);
          console.log('✅ PDF uploaded to OpenAI successfully. ID:', openaiFileId);
        } catch (error) {
          console.error('❌ OpenAI upload failed:', error);
        }

        // Store a reference message
        extractedText = `PDF uploaded to AI providers - Gemini: ${geminiFileUri || 'failed'}, Anthropic: ${anthropicFileId || 'failed'}, OpenAI: ${openaiFileId || 'failed'}`;
      }
    } catch (error) {
      console.error('❌ File processing error:', error);
      processingStatus = 'failed';
      // Set a meaningful error message
      extractedText = `Error uploading PDF: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Upload file to storage
    console.log('Uploading to bucket:', bucketName, 'path:', storagePath);
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file: ' + uploadError.message }, { status: 500 });
    }
    
    console.log('File uploaded successfully to:', storagePath);

    // Save file record to database
    console.log('💾 Saving file record to database:', {
      id: fileId,
      original_name: file.name,
      processing_status: processingStatus,
      extracted_text_length: extractedText?.length || 0,
      extracted_text_preview: extractedText?.substring(0, 100) + '...'
    });

    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        id: fileId,
        conversation_id: conversationId || null,
        user_id: user.id,
        storage_path: storagePath,
        original_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        processing_status: processingStatus,
        extracted_text: extractedText,
        gemini_file_uri: geminiFileUri, // Store the Gemini file URI
        anthropic_file_id: anthropicFileId, // Store the Anthropic file ID
        openai_file_id: openaiFileId // Store the OpenAI file ID
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      
      // Clean up uploaded file
      await supabase.storage.from(bucketName).remove([storagePath]);
      
      return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 });
    }

    // Generate preview URL for images
    let previewUrl: string | undefined;
    if (isImage) {
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath);
      previewUrl = urlData.publicUrl;
      console.log('Generated preview URL:', previewUrl);
    }

    const response: FileUploadResponse = {
      id: fileRecord.id,
      storage_path: fileRecord.storage_path,
      original_name: fileRecord.original_name,
      mime_type: fileRecord.mime_type,
      file_size: fileRecord.file_size,
      processing_status: fileRecord.processing_status,
      extracted_text: fileRecord.extracted_text,
      preview_url: previewUrl
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}