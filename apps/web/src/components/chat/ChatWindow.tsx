"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { StreamingMessageBubble } from "./StreamingMessageBubble";
import { CollapsibleThinking } from "./CollapsibleThinking";
import { Sidebar } from "./Sidebar";
import { WelcomeScreen } from "./WelcomeScreen";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMessageLimit } from "@/contexts/MessageLimitContext";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_MODEL, ModelProvider, AVAILABLE_MODELS } from "@/lib/constants/models";
import { useDefaultModel } from "@/hooks/useDefaultModel";
import type { Database } from "@/lib/types/database";

// Extended types to match actual database schema
type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  max_tokens?: number | null;
  temperature?: number | null;
  message_count?: number | null;
  total_tokens_used?: number | null;
  total_cost_usd?: number | null;
  last_message_at?: string | null;
  is_image_generation_enabled?: boolean | null;
  is_web_search_enabled?: boolean | null;
};

type Message = Database['public']['Tables']['messages']['Row'] & {
  user_id: string;
  cost_usd?: number | null;
  response_time_ms?: number | null;
  finish_reason?: string | null;
  tool_calls?: any;
  attachments?: any;
  updated_at?: string | null;
  document_context?: any | null;
  metadata?: any | null;
  embedding?: string | null;
  thinking_content?: string; // Chain of thought for reasoning models
};

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  preview_url?: string;
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentThinkingContent, setCurrentThinkingContent] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);
  const thinkingContentRef = useRef<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputHeight, setInputHeight] = useState(128); // Default spacer height
  const [selectedModel, setSelectedModel] = useState<{provider: ModelProvider, name: string}>({
    provider: DEFAULT_MODEL.provider,
    name: DEFAULT_MODEL.name
  });
  const { user } = useAuth();
  const { incrementUsage } = useMessageLimit();
  const { defaultModelName } = useDefaultModel();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Create supabase client once
  const supabase = useMemo(() => createClient(), []);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Update selected model when default model changes (for new conversations only)
  useEffect(() => {
    if (defaultModelName && !currentConversation) {
      const defaultModel = AVAILABLE_MODELS.find(m => m.name === defaultModelName);
      if (defaultModel) {
        setSelectedModel({
          provider: defaultModel.provider,
          name: defaultModel.name
        });
      }
    }
  }, [defaultModelName, currentConversation]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      try {
        // Ensure the container is scrollable and hasn't been corrupted
        const container = messagesContainerRef.current;
        const containerHeight = container.clientHeight;
        const scrollHeight = container.scrollHeight;
        
        // Safety check - if something seems wrong with the layout, log it
        if (containerHeight <= 0 || scrollHeight <= 0) {
          console.warn('⚠️ Container dimensions seem incorrect:', { containerHeight, scrollHeight });
        }
        
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Error scrolling to bottom:', error);
        // Fallback: try scrolling the container directly
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }
    }
  }, []);

  const handleTypingChange = (typing: boolean) => {
    setIsTyping(typing);
  };

  // Recovery mechanism - reset scroll position if layout seems broken
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + R to reset layout
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        console.log('🔧 Layout recovery triggered');
        
        // Reset scroll position
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = 0;
          setTimeout(() => scrollToBottom(), 100);
        }
        
        // Force re-render
        setMessages(prev => [...prev]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [scrollToBottom]);

  const loadConversations = async () => {
    if (!user) return;

    setConversationsLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      setConversationsLoading(false);
      return;
    }

    setConversations(data);
    setConversationsLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data);
  };

  const generateConversationTitle = (message: string): string => {
    let title = message.trim().substring(0, 50);
    
    if (message.length > 50) {
      const lastSpace = title.lastIndexOf(' ');
      if (lastSpace > 20) {
        title = title.substring(0, lastSpace);
      }
      title += '...';
    }
    
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  const createNewConversation = async (modelProvider?: ModelProvider, modelName?: string) => {
    if (!user) return null;

    console.log('Creating new conversation with model:', modelProvider, modelName);

    // Use provided model or fall back to selected model or default
    const provider = modelProvider || selectedModel.provider;
    const name = modelName || selectedModel.name;

    // Get model-specific max tokens
    const getModelMaxTokens = (provider: ModelProvider): number => {
      switch (provider) {
        case 'openai':
          return 16384; // GPT-4o-mini max output
        case 'anthropic':
          return 8192;  // Claude 3.5 Haiku max output
        case 'google':
          return 65536; // Gemini 2.5 Flash max output
        case 'deepseek':
          return 64000; // DeepSeek R1 max output
        default:
          return 16384; // Safe default
      }
    };

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: 'New Conversation',
          model_provider: provider,
          model_name: name,
          max_tokens: getModelMaxTokens(provider) // Use model-specific limit
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }


      // Clean the data to avoid circular references and add missing properties
      const cleanData: Conversation = {
        id: data.id,
        user_id: data.user_id,
        title: data.title,
        model_provider: data.model_provider,
        model_name: data.model_name,
        document_id: data.document_id || null,
        max_tokens: data.max_tokens || null,
        temperature: data.temperature || null,
        system_prompt: data.system_prompt || null,
        is_document_chat: data.is_document_chat || null,
        is_image_generation_enabled: data.is_image_generation_enabled || null,
        is_web_search_enabled: data.is_web_search_enabled || null,
        message_count: data.message_count || null,
        total_tokens_used: data.total_tokens_used || null,
        total_cost_usd: data.total_cost_usd || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_message_at: data.last_message_at || null
      };

      setConversations(prev => [cleanData, ...prev]);
      setCurrentConversation(cleanData);
      return cleanData;
    } catch (err) {
      console.error('Caught error in createNewConversation:', err);
      return null;
    }
  };

  const updateConversationTitle = async (conversationId: string, title: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)
      .select()
      .single();

    if (!error && data) {
      // Clean the data to avoid circular references and add missing properties
      const cleanData: Conversation = {
        id: data.id,
        user_id: data.user_id,
        title: data.title,
        model_provider: data.model_provider,
        model_name: data.model_name,
        document_id: data.document_id || null,
        max_tokens: data.max_tokens || null,
        temperature: data.temperature || null,
        system_prompt: data.system_prompt || null,
        is_document_chat: data.is_document_chat || null,
        is_image_generation_enabled: data.is_image_generation_enabled || null,
        is_web_search_enabled: data.is_web_search_enabled || null,
        message_count: data.message_count || null,
        total_tokens_used: data.total_tokens_used || null,
        total_cost_usd: data.total_cost_usd || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_message_at: data.last_message_at || null
      };

      setConversations(prev => prev.map(c =>
        c.id === conversationId ? cleanData : c
      ));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(cleanData);
      }
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return;
    }

    setConversations(prev => {
      const updated = prev.filter(c => c.id !== conversationId);
      
      if (currentConversation?.id === conversationId) {
        if (updated.length > 0) {
          setCurrentConversation(updated[0]);
        } else {
          setCurrentConversation(null);
          setMessages([]);
        }
      }
      
      return updated;
    });
  };

  const handleRenameConversation = async (conversationId: string, newTitle: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .update({ title: newTitle })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('Error renaming conversation:', error);
      return;
    }

    // Clean the data to avoid circular references and add missing properties
    const cleanData: Conversation = {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      model_provider: data.model_provider,
      model_name: data.model_name,
      document_id: data.document_id || null,
      max_tokens: data.max_tokens || null,
      temperature: data.temperature || null,
      system_prompt: data.system_prompt || null,
      is_document_chat: data.is_document_chat || null,
      is_image_generation_enabled: data.is_image_generation_enabled || null,
      is_web_search_enabled: data.is_web_search_enabled || null,
      message_count: data.message_count || null,
      total_tokens_used: data.total_tokens_used || null,
      total_cost_usd: data.total_cost_usd || null,
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_message_at: data.last_message_at || null
    };

    setConversations(prev => prev.map(c =>
      c.id === conversationId ? cleanData : c
    ));

    if (currentConversation?.id === conversationId) {
      setCurrentConversation(cleanData);
    }
  };

  const handleInputHeightChange = useCallback((height: number) => {
    setInputHeight(Math.max(height, 128)); // Minimum 128px spacer
  }, []);

  // Wrapper function for Sidebar to avoid passing React events to createNewConversation
  const handleNewConversation = useCallback(() => {
    createNewConversation();
  }, []);

  const handleModelChange = async (provider: ModelProvider, modelName: string) => {
    // If no conversation exists, just update the selected model for future use
    if (!currentConversation) {
      setSelectedModel({ provider, name: modelName });
      return;
    }

    const { data, error } = await supabase
      .from('conversations')
      .update({
        model_provider: provider,
        model_name: modelName
      })
      .eq('id', currentConversation.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating conversation model:', error);
      return;
    }

    // Clean the data to avoid circular references and add missing properties
    const cleanData: Conversation = {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      model_provider: data.model_provider,
      model_name: data.model_name,
      document_id: data.document_id || null,
      max_tokens: data.max_tokens || null,
      temperature: data.temperature || null,
      system_prompt: data.system_prompt || null,
      is_document_chat: data.is_document_chat || null,
      is_image_generation_enabled: data.is_image_generation_enabled || null,
      is_web_search_enabled: data.is_web_search_enabled || null,
      message_count: data.message_count || null,
      total_tokens_used: data.total_tokens_used || null,
      total_cost_usd: data.total_cost_usd || null,
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_message_at: data.last_message_at || null
    };

    setCurrentConversation(cleanData);
    setConversations(prev => prev.map(c =>
      c.id === currentConversation.id ? cleanData : c
    ));
  };

  const handleRetryMessage = async (messageId: string) => {
    if (!user || !currentConversation) return;

    // Find the message to retry
    const messageToRetry = messages.find(m => m.id === messageId);
    if (!messageToRetry || messageToRetry.role !== 'assistant') return;

    // Find the previous user message
    const messageIndex = messages.findIndex(m => m.id === messageId);
    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    // Remove the AI message and any messages after it, but keep the user message
    const messagesUpToUser = messages.slice(0, messageIndex);
    setMessages(messagesUpToUser);

    // Generate new AI response using existing conversation context
    setLoading(true);
    
    try {
      const conversation = currentConversation;
      
      // Prepare messages for AI (including the existing user message)
      const conversationMessages = messagesUpToUser.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Start streaming immediately
      setIsStreaming(true);
      setStreamingMessage('');
      setCurrentThinkingContent('');
      thinkingContentRef.current = '';
      setIsThinking(false);

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationMessages,
          conversationId: conversation.id,
          provider: conversation.model_provider,
          model: conversation.model_name,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No readable stream available');
      }

      let accumulatedContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                // Handle thinking content for reasoning models
                if (data.thinking) {
                  thinkingContentRef.current += data.thinking;
                  setCurrentThinkingContent(thinkingContentRef.current);
                  setIsThinking(true);
                } else if (data.isThinking) {
                  setIsThinking(true);
                }

                if (data.content) {
                  accumulatedContent += data.content;
                  setStreamingMessage(accumulatedContent);
                  // If we start getting content, we're done thinking
                  if (isThinking) {
                    setIsThinking(false);
                  }
                }

                if (data.done) {
                  // Generate client-side ID for immediate display
                  const tempId = 'ai-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
                  
                  const finalThinkingContent = thinkingContentRef.current;
                  
                  const aiMessage: Message = {
                    id: tempId,
                    conversation_id: conversation.id,
                    user_id: user.id,
                    role: 'assistant',
                    content: accumulatedContent,
                    provider: conversation.model_provider,
                    model: conversation.model_name,
                    tokens_used: 0,
                    cost_usd: null,
                    response_time_ms: null,
                    finish_reason: 'stop',
                    tool_calls: null,
                    attachments: null,
                    embedding: null,
                    document_context: null,
                    metadata: null,
                    thinking_content: finalThinkingContent || undefined,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };

                  // Add AI message and clear streaming
                  setMessages(prev => [...prev, aiMessage]);
                  setIsStreaming(false);
                  setStreamingMessage('');
                  setIsThinking(false);
                  
                  return; // Exit the streaming loop
                }
              } catch (parseError) {
                console.error('Error parsing chunk:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('Error retrying message:', error);
      setIsStreaming(false);
      setStreamingMessage('');
      setIsThinking(false);
      setCurrentThinkingContent('');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string, attachments?: FileAttachment[], webSearch?: boolean) => {
    if (!user) return;

    // Create conversation if none exists, using the selected model
    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createNewConversation(selectedModel.provider, selectedModel.name);
      if (!conversation) return;
    }

    setLoading(true);
    
    try {
      // Save user message to database
      const { data: userMessage, error: userError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'user',
          content,
          provider: conversation.model_provider,
          model: conversation.model_name,
          attachments: attachments ? JSON.stringify(attachments.map(att => ({
            id: att.id,
            name: att.name,
            type: att.type,
            size: att.size,
            preview_url: att.preview_url
          }))) : null
        })
        .select()
        .single();

      if (userError) {
        console.error('Error saving user message:', userError);
        setLoading(false);
        return;
      }

      // Add user message to UI
      setMessages(prev => [...prev, userMessage]);

      // Increment message usage count
      incrementUsage();

      // Update title if this is the first message (conversation title is still "New Conversation")
      if (conversation.title === 'New Conversation') {
        const newTitle = generateConversationTitle(content);
        await updateConversationTitle(conversation.id, newTitle);
      }

      // Prepare messages for AI
      const allMessages = [...messages, userMessage];
      const conversationMessages = allMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Start streaming immediately with optimized settings
      setIsStreaming(true);
      setStreamingMessage('');
      setCurrentThinkingContent(''); // Reset thinking content for new message
      thinkingContentRef.current = ''; // Reset ref as well
      setIsThinking(false);

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          messages: conversationMessages,
          conversationId: conversation.id,
          provider: conversation.model_provider,
          model: conversation.model_name,
          attachments: attachments || [],
          webSearch: webSearch || false
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';
      let chunkBuffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunkBuffer += new TextDecoder().decode(value, { stream: true });
          const lines = chunkBuffer.split('\n');
          
          // Keep incomplete line in buffer
          chunkBuffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.error) {
                  // Display user-friendly error message
                  setIsStreaming(false);
                  setStreamingMessage('');
                  setIsThinking(false);
                  setCurrentThinkingContent('');
                  
                  // Create an error message bubble
                  const errorMessageId = 'error-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
                  const errorMessage: Message = {
                    id: errorMessageId,
                    conversation_id: conversation.id,
                    user_id: user.id,
                    role: 'assistant',
                    content: `❌ **Error**: ${data.error}`,
                    provider: conversation.model_provider,
                    model: conversation.model_name,
                    tokens_used: 0,
                    cost_usd: null,
                    response_time_ms: null,
                    created_at: new Date().toISOString(),
                    document_context: null,
                    embedding: null,
                    metadata: null
                  };

                  setMessages(prev => [...prev, errorMessage]);
                  return;
                }

                // Handle thinking content for reasoning models
                if (data.thinking) {
                  thinkingContentRef.current += data.thinking;
                  setCurrentThinkingContent(thinkingContentRef.current);
                  setIsThinking(true);
                }

                if (data.content) {
                  accumulatedContent += data.content;
                  // Update streaming message immediately without debouncing
                  setStreamingMessage(accumulatedContent);
                  // If we start getting content, we're done thinking
                  if (isThinking) {
                    setIsThinking(false);
                  }
                }

                if (data.done) {
                  // Generate client-side ID for immediate display
                  const tempId = 'ai-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
                  
                  const finalThinkingContent = thinkingContentRef.current;
                  
                  const aiMessage: Message = {
                    id: tempId,
                    conversation_id: conversation.id,
                    user_id: user.id,
                    role: 'assistant',
                    content: accumulatedContent,
                    provider: conversation.model_provider,
                    model: conversation.model_name,
                    tokens_used: 0,
                    cost_usd: null,
                    response_time_ms: null,
                    finish_reason: 'stop',
                    tool_calls: null,
                    attachments: null,
                    embedding: null,
                    document_context: null,
                    metadata: null,
                    thinking_content: finalThinkingContent || undefined,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };

                  // Add AI message and clear streaming states
                  setMessages(prev => [...prev, aiMessage]);
                  setIsStreaming(false);
                  setStreamingMessage('');
                  setIsThinking(false);
                  // DON'T clear currentThinkingContent here - let it persist for the component
                  
                  return; // Exit the streaming loop
                }
              } catch (parseError) {
                console.error('Error parsing chunk:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setIsStreaming(false);
      setStreamingMessage('');
      setIsThinking(false);
      setCurrentThinkingContent('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      <Sidebar
        conversations={conversations}
        currentConversation={currentConversation}
        onConversationSelect={setCurrentConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        loading={conversationsLoading}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col relative">
        <Header />
        
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto flex justify-center"
        >
          <div className="w-full max-w-4xl p-6">
            {currentConversation ? (
              messages.length === 0 && !isStreaming && !loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className={`transition-opacity duration-300 ${isTyping ? 'opacity-0' : 'opacity-100'}`}>
                    <WelcomeScreen onSuggestionClick={handleSendMessage} conversationId={currentConversation?.id || null} />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <MessageBubble 
                      key={message.id} 
                      message={message}
                      onRetry={message.role === 'assistant' ? () => handleRetryMessage(message.id) : undefined}
                    />
                  ))}

                  {/* Show current thinking for the streaming message */}
                  {(isThinking || (currentThinkingContent && isStreaming)) && (
                    <CollapsibleThinking 
                      thinkingContent={currentThinkingContent}
                      isThinking={isThinking}
                      isCompleted={!isThinking && !isStreaming}
                    />
                  )}

                  {isStreaming && (
                    <StreamingMessageBubble content={streamingMessage} />
                  )}

                  {loading && !isStreaming && (
                    <div className="flex justify-start">
                      <div className="bg-muted/50 border border-border/50 rounded-2xl px-4 py-3">
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dynamic spacer to ensure messages are visible above input area */}
                  <div style={{ height: `${inputHeight + 24}px` }} />
                  <div ref={messagesEndRef} />
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className={`transition-opacity duration-300 ${isTyping ? 'opacity-0' : 'opacity-100'}`}>
                  <WelcomeScreen onSuggestionClick={handleSendMessage} conversationId={null} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <div className="pointer-events-auto flex justify-center">
            <div className="w-full max-w-4xl">
              <ChatInput
                onSend={handleSendMessage}
                disabled={loading}
                onTypingChange={handleTypingChange}
                currentConversation={currentConversation}
                onModelChange={handleModelChange}
                selectedModel={selectedModel}
                onHeightChange={handleInputHeightChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}