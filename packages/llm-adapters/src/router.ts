import { CostOptimizedProvider, ChatMessage, StreamChunk, StreamOptions, LLMProvider } from './types';
import { OpenAIMiniProvider } from './providers/openai-mini';
import { ClaudeHaikuProvider } from './providers/claude-haiku';
import { GeminiFlashProvider } from './providers/gemini-flash';
import { DeepSeekR1Provider } from './providers/deepseek-r1';

export interface LLMRouterConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  deepseekApiKey?: string;
}

export class LLMRouter {
  private providers: Map<string, CostOptimizedProvider> = new Map();
  
  constructor(config: LLMRouterConfig) {
    if (config.openaiApiKey) {
      this.providers.set('openai', new OpenAIMiniProvider(config.openaiApiKey));
    }
    
    if (config.anthropicApiKey) {
      this.providers.set('anthropic', new ClaudeHaikuProvider(config.anthropicApiKey));
    }
    
    if (config.googleApiKey) {
      this.providers.set('google', new GeminiFlashProvider(config.googleApiKey));
    }
    
    if (config.deepseekApiKey) {
      this.providers.set('deepseek', new DeepSeekR1Provider(config.deepseekApiKey));
    }
  }
  
  getProvider(name: LLMProvider): CostOptimizedProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not configured or not found`);
    }
    return provider;
  }
  
  async *stream(params: {
    messages: ChatMessage[];
    provider: LLMProvider;
    model: string;
    userId?: string;
    conversationId?: string;
    options?: StreamOptions;
  }): AsyncIterable<StreamChunk> {
    const provider = this.getProvider(params.provider);
    
    // Validate model is supported by provider
    if (!provider.models.includes(params.model)) {
      throw new Error(`Model ${params.model} not supported by provider ${params.provider}`);
    }
    
    yield* provider.stream(params.messages, {
      ...params.options,
      userId: params.userId,
      conversationId: params.conversationId,
      model: params.model
    });
  }
  
  async embed(text: string, provider: LLMProvider = 'openai'): Promise<number[]> {
    const providerInstance = this.getProvider(provider);
    return providerInstance.embed(text);
  }
  
  calculateCost(provider: LLMProvider, inputTokens: number, outputTokens: number): number {
    const providerInstance = this.getProvider(provider);
    const inputCost = (inputTokens / 1000) * providerInstance.costPerToken.input;
    const outputCost = (outputTokens / 1000) * providerInstance.costPerToken.output;
    return inputCost + outputCost;
  }
  
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
  
  getProviderModels(provider: LLMProvider): string[] {
    const providerInstance = this.providers.get(provider);
    return providerInstance?.models || [];
  }
}