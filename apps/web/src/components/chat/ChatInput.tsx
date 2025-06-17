"use client";

import { useState, useRef, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Search, X, FileText, Image, Loader2 } from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import type { Database } from "@/lib/types/database";
import type { ModelProvider } from "@/lib/constants/models";
import { DEFAULT_MODEL, AVAILABLE_MODELS } from "@/lib/constants/models";

type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  is_web_search_enabled?: boolean | null;
};

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  preview_url?: string;
  uploading?: boolean;
  progress?: number;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: FileAttachment[], webSearch?: boolean) => void;
  disabled?: boolean;
  onTypingChange?: (isTyping: boolean) => void;
  currentConversation?: Conversation | null;
  onModelChange?: (provider: ModelProvider, modelName: string) => void;
  onHeightChange?: (height: number) => void;
}

export function ChatInput({ onSend, disabled = false, onTypingChange, currentConversation, onModelChange, onHeightChange }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [uploadAbortControllers, setUploadAbortControllers] = useState<Map<string, AbortController>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    const container = containerRef.current;
    if (!textarea || !container) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate the number of lines based on line height
    const lineHeight = 24; // 24px line height
    const maxLines = 10;
    const maxHeight = lineHeight * maxLines;
    
    // Set height based on content, but cap at maxHeight
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;

    // Report total container height to parent
    if (onHeightChange) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        const totalHeight = container.offsetHeight;
        onHeightChange(totalHeight);
      });
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);

    // Notify parent about typing state
    if (onTypingChange) {
      onTypingChange(newMessage.trim().length > 0);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (disabled) return;
    
    setUploading(true);
    
    try {
      const fileArray = Array.from(files);
      
      // Generate consistent temp IDs for each file
      const baseTimestamp = Date.now();
      const tempAttachments: FileAttachment[] = fileArray.map((file, index) => {
        const tempId = `temp-${baseTimestamp}-${index}`;
        return {
          id: tempId,
          name: file.name,
          type: file.type,
          size: file.size,
          uploading: true,
          progress: 1,
        };
      });
      
      setAttachments(prev => [...prev, ...tempAttachments]);
      
      // Upload files concurrently
      const uploadPromises = fileArray.map(async (file, index) => {
        const tempId = `temp-${baseTimestamp}-${index}`;
        const abortController = new AbortController();
        
        // Store the abort controller
        setUploadAbortControllers(prev => new Map(prev).set(tempId, abortController));
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          if (currentConversation?.id) {
            formData.append('conversationId', currentConversation.id);
          }
          // Pass the selected model provider to only upload to that provider
          if (currentConversation?.model_provider) {
            formData.append('modelProvider', currentConversation.model_provider);
          }
          
          // Use XMLHttpRequest for real progress tracking
          const response = await new Promise<Response>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            // console.log(`Setting up XMLHttpRequest for ${file.name}`);
            
            // Track upload progress (file transfer to server, limit to 80% since server processing takes time)
            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                // Limit to 80% since server processing (provider uploads) takes significant time
                const uploadPercent = Math.round((event.loaded / event.total) * 80);
                // console.log(`Upload progress for ${file.name}:`, {
                //   loaded: event.loaded,
                //   total: event.total,
                //   percent: uploadPercent,
                //   lengthComputable: event.lengthComputable
                // });
                setAttachments(prev => {
                  const updated = prev.map(att => 
                    att.id === tempId ? { ...att, progress: uploadPercent } : att
                  );
                  // console.log(`Updated attachments for ${tempId}:`, updated.find(a => a.id === tempId)?.progress);
                  return updated;
                });
              } else {
                // console.log(`Upload progress for ${file.name}: length not computable`);
              }
            });
            
            // Add more event listeners for debugging
            xhr.upload.addEventListener('loadstart', () => {
              // console.log(`Upload started for ${file.name}`);
            });
            
            xhr.upload.addEventListener('loadend', () => {
              // console.log(`Upload finished for ${file.name} - now server processing...`);
              // Start showing server processing progress from 80% to 95%
              let processingProgress = 80;
              const processingInterval = setInterval(() => {
                processingProgress = Math.min(processingProgress + 2, 95);
                setAttachments(prev => prev.map(att => 
                  att.id === tempId ? { ...att, progress: processingProgress } : att
                ));
                
                if (processingProgress >= 95) {
                  clearInterval(processingInterval);
                }
              }, 2000); // Update every 2 seconds during server processing
              
              // Store interval for cleanup on abort
              abortController.signal.addEventListener('abort', () => {
                clearInterval(processingInterval);
              });
            });
            
            // Handle completion
            xhr.addEventListener('load', () => {
              // console.log(`Upload completed for ${file.name}, status: ${xhr.status}`);
              if (xhr.status >= 200 && xhr.status < 300) {
                // Create a Response-like object
                const response = new Response(xhr.responseText, {
                  status: xhr.status,
                  statusText: xhr.statusText,
                  headers: new Headers({
                    'content-type': xhr.getResponseHeader('content-type') || 'application/json'
                  })
                });
                resolve(response);
              } else {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
              }
            });
            
            // Handle errors
            xhr.addEventListener('error', () => {
              reject(new Error('Network error'));
            });
            
            // Handle abort
            xhr.addEventListener('abort', () => {
              const abortError = new Error('Upload cancelled');
              abortError.name = 'AbortError';
              reject(abortError);
            });
            
            // Connect abort controller to xhr
            abortController.signal.addEventListener('abort', () => {
              xhr.abort();
            });
            
            // Start the request
            xhr.open('POST', '/api/files/upload');
            // console.log(`Starting upload for ${file.name}, size: ${file.size} bytes`);
            xhr.send(formData);
          });
          
          // Clean up abort controller on success
          setUploadAbortControllers(prev => {
            const newMap = new Map(prev);
            newMap.delete(tempId);
            return newMap;
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
          }
          
          const result = await response.json();
          
          // Server processing complete - set to 100% and then update with real data
          setAttachments(prev => prev.map(att => 
            att.id === tempId ? { ...att, progress: 100 } : att
          ));
          
          // Update with real data after showing 100% briefly
          setTimeout(() => {
            setAttachments(prev => prev.map(att => 
              att.id === tempId ? {
                id: result.id,
                name: result.original_name,
                type: result.mime_type,
                size: result.file_size,
                preview_url: result.preview_url,
                uploading: false,
                progress: undefined,
              } : att
            ));
          }, 1000);
          
        } catch (error) {
          // Clean up abort controller on error
          setUploadAbortControllers(prev => {
            const newMap = new Map(prev);
            newMap.delete(tempId);
            return newMap;
          });
          
          // Only show error if it wasn't aborted by user
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error(`File upload error for ${file.name}:`, error);
          }
          
          // Remove failed/cancelled upload from attachments
          setAttachments(prev => prev.filter(att => att.id !== tempId));
        }
      });
      
      await Promise.all(uploadPromises);
      
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeAttachment = (id: string) => {
    // If the file is uploading, cancel the upload
    const abortController = uploadAbortControllers.get(id);
    if (abortController) {
      abortController.abort();
      setUploadAbortControllers(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }
    
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || attachments.filter(f => !f.uploading).length > 0) && !disabled && !uploading && !attachments.some(f => f.uploading)) {
      onSend(message.trim(), attachments, webSearchEnabled);
      setMessage("");
      setAttachments([]);
      setWebSearchEnabled(false); // Reset web search after sending
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // Notify parent that user is no longer typing
      if (onTypingChange) {
        onTypingChange(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Check if current model supports web search
  const currentModel = AVAILABLE_MODELS.find(m => 
    m.provider === (currentConversation?.model_provider || DEFAULT_MODEL.provider) && 
    m.name === (currentConversation?.model_name || DEFAULT_MODEL.name)
  );
  const supportsWebSearch = currentModel?.supportsWebSearch && currentConversation?.is_web_search_enabled;

  return (
    <div ref={containerRef} className="relative">
      {/* Backdrop blur overlay extending to full height */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="px-6 h-full">
          <div className="max-w-4xl mx-auto h-full relative">
            {/* Blur area that extends full height with square bottom */}
            <div className="absolute inset-0 backdrop-blur-lg bg-background/20" 
                 style={{
                   maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%)',
                   WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%)',
                   borderRadius: '1.5rem 1.5rem 0 0'
                 }}>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative z-10 pb-6 px-6">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative space-y-3">
            {/* File attachments preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2">
                {attachments.map((file) => (
                  <div key={file.id} className="relative group">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 border border-border/20 min-w-[140px]">
                      {/* File icon or thumbnail */}
                      <div className="relative flex-shrink-0">
                        {file.uploading ? (
                          <div className="flex items-center gap-1">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            {file.progress !== undefined && (
                              <span className="text-[10px] font-mono text-muted-foreground min-w-[20px]">
                                {file.progress}%
                              </span>
                            )}
                          </div>
                        ) : file.type.startsWith('image/') && file.preview_url ? (
                          <div className="relative">
                            <img 
                              src={file.preview_url} 
                              alt={file.name}
                              className="h-8 w-8 object-cover rounded border"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded transition-colors" />
                          </div>
                        ) : file.type.startsWith('image/') ? (
                          <Image className="h-4 w-4 text-blue-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      
                      {/* File name */}
                      <span className="text-sm truncate max-w-[80px] flex-1">{file.name}</span>
                      
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeAttachment(file.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                        disabled={false}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    
                    {/* Upload progress bar */}
                    {file.uploading && file.progress !== undefined && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted rounded-b-lg overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-200 ease-out"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Text input area */}
            <div className="relative p-4 border border-border/20 rounded-3xl bg-card/20 backdrop-blur-xl focus-within:border-primary transition-colors duration-200 shadow-lg">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                className="w-full min-h-[24px] resize-none border-0 p-0 text-base bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 overflow-y-auto"
                style={{ lineHeight: '24px' }}
                rows={1}
                disabled={disabled}
              />
            </div>

            {/* Control bar underneath */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Model selector */}
                {onModelChange && (
                  <ModelSelector
                    selectedModel={currentConversation?.model_name || DEFAULT_MODEL.name}
                    onModelChange={onModelChange}
                    disabled={disabled}
                    compact={true}
                  />
                )}

                {/* Search button */}
                {supportsWebSearch && (
                  <button
                    type="button"
                    onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                    className={cn(
                      buttonVariants({ variant: webSearchEnabled ? "default" : "ghost", size: "sm" }), 
                      "h-8 px-3 transition-colors",
                      webSearchEnabled 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    disabled={disabled}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </button>
                )}

                {/* Attachment button */}
                <button
                  type="button"
                  onClick={handleFileSelect}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  )}
                  disabled={disabled}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Send button on the right */}
              <button
                type="submit"
                disabled={(!message.trim() && attachments.filter(f => !f.uploading).length === 0) || disabled || uploading || attachments.some(f => f.uploading)}
                className={cn(buttonVariants({ size: "sm" }), "h-8 w-8 p-0 rounded-lg bg-primary hover:bg-primary/90")}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files);
                  e.target.value = ''; // Reset input
                }
              }}
            />
          </form>

          {/* Footer */}
          <div className="flex items-center justify-center mt-4">
            <div className="text-xs text-muted-foreground">
              Make sure you agree to our{" "}
              <button className="underline hover:no-underline">Terms</button>
              {" "}and{" "}
              <button className="underline hover:no-underline">Privacy Policy</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}