"use client";

import { useState, useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { Sidebar } from "./Sidebar";
import { ModelSelector } from "./ModelSelector";
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
    }
  }, [currentConversation]);

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

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

    // If no current conversation and we have conversations, select the first one
    if (!currentConversation && data.length > 0) {
      setCurrentConversation(data[0]);
    }
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

    setConversations([data, ...conversations]);
    setCurrentConversation(data);
    setMessages([]);
    return data;
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

    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);

    // If we deleted the current conversation, select another one
    if (currentConversation?.id === conversationId) {
      if (updatedConversations.length > 0) {
        setCurrentConversation(updatedConversations[0]);
      } else {
        setCurrentConversation(null);
        setMessages([]);
      }
    }
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

    setConversations(conversations.map(c =>
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
    setConversations(conversations.map(c =>
      c.id === currentConversation.id ? data : c
    ));
  };

  const updateConversationMetadata = async (conversationId: string) => {
    // Update conversation metadata without reloading messages
    const { data, error } = await supabase
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (!error && data) {
      setConversations(conversations.map(c =>
        c.id === conversationId ? data : c
      ));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(data);
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    // Create new conversation if none exists
    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createNewConversation();
      if (!conversation) {
        console.error('Failed to create conversation');
        return;
      }
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setLoading(true);
    setIsStreaming(false);
    setStreamingMessage('');

    try {
      // Add user message to database
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

      // Add user message to UI immediately
      setMessages(prev => [...prev, userMessage]);

      // Prepare messages for AI (include the new user message)
      const conversationMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Start streaming
      setIsStreaming(true);

      // Stream response from AI
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

                if (data.error) {
                  throw new Error(data.error);
                }

                if (data.content) {
                  accumulatedContent += data.content;
                  setStreamingMessage(accumulatedContent);
                }

                if (data.done) {
                  // Streaming is complete, create final message and add to messages
                  setIsStreaming(false);

                  // Create the final assistant message
                  const finalMessage: Message = {
                    id: data.messageId || 'final-' + Date.now(),
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

                  // Add the final message to the messages array
                  setMessages(prev => [...prev, finalMessage]);
                  setStreamingMessage('');

                  // Update conversation metadata without reloading messages
                  await updateConversationMetadata(conversation.id);
                  break;
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
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConversation={currentConversation}
        onConversationSelect={setCurrentConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        loading={conversationsLoading}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="border-b px-4 py-3 bg-card">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{currentConversation.title}</h2>
                <ModelSelector
                  selectedModel={currentConversation.model_name}
                  onModelChange={handleModelChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {/* Streaming Message */}
              {isStreaming && streamingMessage && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs">AI</span>
                  </div>
                  <div className="flex flex-col items-start max-w-[70%]">
                    <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2">
                      <p className="text-sm whitespace-pre-wrap">{streamingMessage}</p>
                      {/* Typing indicator */}
                      <span className="inline-block w-2 h-4 bg-muted-foreground/50 animate-pulse ml-1"></span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {currentConversation && (
                        <span className="text-xs text-muted-foreground bg-muted/50 px-1 rounded">
                          {currentConversation.model_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {loading && !isStreaming && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs">AI</span>
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput onSend={handleSendMessage} disabled={loading} />
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-semibold mb-4">Welcome to OrionChat</h2>
              <p className="text-muted-foreground mb-6">
                Start a new conversation to begin chatting with AI models.
              </p>
              <button
                onClick={createNewConversation}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
              >
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}