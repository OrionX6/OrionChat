"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { Sidebar } from "./Sidebar";
import { WelcomeScreen } from "./WelcomeScreen";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_MODEL, ModelProvider } from "@/lib/constants/models";
import type { Database } from "@/lib/types/database";

type Message = Database['public']['Tables']['messages']['Row'];
type Conversation = Database['public']['Tables']['conversations']['Row'];

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

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

  const createNewConversation = async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: 'New Conversation',
        model_provider: DEFAULT_MODEL.provider,
        model_name: DEFAULT_MODEL.name
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    setConversations(prev => [data, ...prev]);
    setCurrentConversation(data);
    return data;
  };

  const updateConversationTitle = async (conversationId: string, title: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)
      .select()
      .single();

    if (!error && data) {
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? data : c
      ));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(data);
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

    setConversations(prev => prev.map(c =>
      c.id === conversationId ? data : c
    ));

    if (currentConversation?.id === conversationId) {
      setCurrentConversation(data);
    }
  };

  const handleModelChange = async (provider: ModelProvider, modelName: string) => {
    if (!currentConversation) return;

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

    setCurrentConversation(data);
    setConversations(prev => prev.map(c =>
      c.id === currentConversation.id ? data : c
    ));
  };

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    // Create conversation if none exists
    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createNewConversation();
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
          model: conversation.model_name
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
          model: conversation.model_name
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
                  throw new Error(data.error);
                }

                if (data.content) {
                  accumulatedContent += data.content;
                  // Update streaming message immediately without debouncing
                  setStreamingMessage(accumulatedContent);
                }

                if (data.done) {
                  // Generate client-side ID for immediate display
                  const tempId = 'ai-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
                  
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
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };

                  // Add AI message and clear streaming in one atomic update
                  setMessages(prev => [...prev, aiMessage]);
                  setIsStreaming(false);
                  setStreamingMessage('');
                  
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
        onNewConversation={createNewConversation}
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
                  <WelcomeScreen onSuggestionClick={handleSendMessage} />
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}

                  {isStreaming && (
                    <div className="flex justify-start">
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <div className="bg-muted/50 text-foreground border border-border/50 rounded-2xl px-4 py-3 min-h-[2.5rem] flex items-start w-full">
                          {streamingMessage ? (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{streamingMessage}</p>
                          ) : (
                            <div className="flex space-x-1 items-center">
                              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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

                  {/* Spacer to ensure messages are visible above input area */}
                  <div className="h-32" />
                  <div ref={messagesEndRef} />
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <WelcomeScreen onSuggestionClick={handleSendMessage} />
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
                currentConversation={currentConversation}
                onModelChange={handleModelChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}