"use client";

import { useState, useRef, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Search, X, FileText, Image } from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import type { Database } from "@/lib/types/database";
import type { ModelProvider } from "@/lib/constants/models";
import { DEFAULT_MODEL } from "@/lib/constants/models";

type Conversation = Database['public']['Tables']['conversations']['Row'];

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  preview_url?: string;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: FileAttachment[]) => void;
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
    if (uploading || disabled) return;
    
    setUploading(true);
    
    try {
      const uploadedFiles: FileAttachment[] = [];
      
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        if (currentConversation?.id) {
          formData.append('conversationId', currentConversation.id);
        }
        
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }
        
        const result = await response.json();
        uploadedFiles.push({
          id: result.id,
          name: result.original_name,
          type: result.mime_type,
          size: result.file_size,
          preview_url: result.preview_url,
        });
      }
      
      setAttachments(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('File upload error:', error);
      // TODO: Show error toast notification
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || attachments.length > 0) && !disabled && !uploading) {
      onSend(message.trim(), attachments);
      setMessage("");
      setAttachments([]);
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
                  <div key={file.id} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 border border-border/20">
                    {file.type.startsWith('image/') ? (
                      <Image className="h-4 w-4 text-blue-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm truncate max-w-[120px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(file.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
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
                disabled={disabled || uploading}
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
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-3 text-muted-foreground hover:text-foreground")}
                  disabled={disabled}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </button>

                {/* Attachment button */}
                <button
                  type="button"
                  onClick={handleFileSelect}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-8 w-8 p-0 text-muted-foreground hover:text-foreground",
                    uploading && "animate-pulse"
                  )}
                  disabled={disabled || uploading}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </div>

              {/* Send button on the right */}
              <button
                type="submit"
                disabled={(!message.trim() && attachments.length === 0) || disabled || uploading}
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