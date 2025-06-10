export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'deepseek';

export interface ModelInfo {
  id: string;
  name: string;
  provider: ModelProvider;
  displayName: string;
  description: string;
  maxTokens: number;
  costPer1KTokens: {
    input: number;
    output: number;
  };
  supportsFunctions: boolean;
  supportsVision: boolean;
  supportsWebSearch: boolean;
  supportsFileUpload: boolean;
  supportsReasoning: boolean;
  icon?: string;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  // OpenAI Models
  {
    id: 'gpt-4o-mini',
    name: 'gpt-4o-mini',
    provider: 'openai',
    displayName: 'GPT-4o Mini',
    description: 'Fast and cost-effective model for most tasks',
    maxTokens: 128000,
    costPer1KTokens: {
      input: 0.015,
      output: 0.06,
    },
    supportsFunctions: true,
    supportsVision: true,
    supportsWebSearch: false,
    supportsFileUpload: true,
    supportsReasoning: false,
    icon: '🔥',
  },
  {
    id: 'gpt-4o',
    name: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    description: 'Most capable OpenAI model with vision and function calling',
    maxTokens: 128000,
    costPer1KTokens: {
      input: 0.25,
      output: 1.0,
    },
    supportsFunctions: true,
    supportsVision: true,
    supportsWebSearch: false,
    supportsFileUpload: true,
    supportsReasoning: false,
    icon: '⚡',
  },
  
  // Anthropic Models
  {
    id: 'claude-3-haiku-20240307',
    name: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    displayName: 'Claude 3 Haiku',
    description: 'Fast and affordable Claude model',
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.025,
      output: 0.125,
    },
    supportsFunctions: true,
    supportsVision: true,
    supportsWebSearch: false,
    supportsFileUpload: true,
    supportsReasoning: false,
    icon: '🎯',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    displayName: 'Claude 3.5 Sonnet',
    description: 'Balanced performance and capability',
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.3,
      output: 1.5,
    },
    supportsFunctions: true,
    supportsVision: true,
    supportsWebSearch: false,
    supportsFileUpload: true,
    supportsReasoning: true,
    icon: '🎭',
  },
  
  // Google Models
  {
    id: 'gemini-2.0-flash-exp',
    name: 'gemini-2.0-flash-exp',
    provider: 'google',
    displayName: 'Gemini 2.0 Flash',
    description: 'Google\'s latest fast model with multimodal capabilities',
    maxTokens: 1000000,
    costPer1KTokens: {
      input: 0.0075,
      output: 0.03,
    },
    supportsFunctions: true,
    supportsVision: true,
    supportsWebSearch: true,
    supportsFileUpload: true,
    supportsReasoning: false,
    icon: '✨',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'gemini-1.5-pro',
    provider: 'google',
    displayName: 'Gemini 1.5 Pro',
    description: 'Google\'s most capable model with large context window',
    maxTokens: 2000000,
    costPer1KTokens: {
      input: 0.125,
      output: 0.375,
    },
    supportsFunctions: true,
    supportsVision: true,
    supportsWebSearch: true,
    supportsFileUpload: true,
    supportsReasoning: true,
    icon: '🚀',
  },
  
  // DeepSeek Models
  {
    id: 'deepseek-r1',
    name: 'deepseek-r1',
    provider: 'deepseek',
    displayName: 'DeepSeek R1',
    description: 'Reasoning-focused model with strong analytical capabilities',
    maxTokens: 64000,
    costPer1KTokens: {
      input: 0.014,
      output: 0.28,
    },
    supportsFunctions: false,
    supportsVision: false,
    supportsWebSearch: false,
    supportsFileUpload: false,
    supportsReasoning: true,
    icon: '🧠',
  },
];

export const MODELS_BY_PROVIDER: Record<ModelProvider, ModelInfo[]> = {
  openai: AVAILABLE_MODELS.filter(m => m.provider === 'openai'),
  anthropic: AVAILABLE_MODELS.filter(m => m.provider === 'anthropic'),
  google: AVAILABLE_MODELS.filter(m => m.provider === 'google'),
  deepseek: AVAILABLE_MODELS.filter(m => m.provider === 'deepseek'),
};

export const DEFAULT_MODEL = AVAILABLE_MODELS.find(m => m.id === 'gpt-4o-mini')!;

export function getModelById(id: string): ModelInfo | undefined {
  return AVAILABLE_MODELS.find(m => m.id === id);
}

export function getModelsByProvider(provider: ModelProvider): ModelInfo[] {
  return MODELS_BY_PROVIDER[provider] || [];
}

export function formatModelDisplayName(model: ModelInfo): string {
  return `${model.displayName} (${model.provider})`;
}

export function formatCostDisplay(model: ModelInfo): string {
  const inputCost = (model.costPer1KTokens.input / 100).toFixed(4);
  const outputCost = (model.costPer1KTokens.output / 100).toFixed(4);
  return `$${inputCost}/$${outputCost} per 1K tokens`;
}
