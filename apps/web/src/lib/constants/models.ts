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
    description: 'OpenAI\'s most cost-efficient model with 128K context and vision capabilities',
    maxTokens: 128000,
    costPer1KTokens: {
      input: 0.015,
      output: 0.06,
    },
    supportsFunctions: true,
    supportsVision: true,
    supportsWebSearch: true,
    supportsFileUpload: true,
    supportsReasoning: false,
    icon: '⚡',
  },
  
  // Anthropic Models
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    displayName: 'Claude 3.5 Haiku',
    description: 'Anthropic\'s fastest model with advanced coding and reasoning capabilities',
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.08,
      output: 0.40,
    },
    supportsFunctions: true,
    supportsVision: false, // Claude 3.5 Haiku is text-only, no vision support
    supportsWebSearch: false,
    supportsFileUpload: true, // Supports text files and PDFs, but not images
    supportsReasoning: true,
    icon: '💙',
  },
  
  // Google Models
  {
    id: 'gemini-2.0-flash-exp',
    name: 'gemini-2.0-flash-exp',
    provider: 'google',
    displayName: 'Gemini 2.0 Flash',
    description: 'Google\'s workhorse model with 1M context, multimodal I/O and enhanced performance',
    maxTokens: 1000000,
    costPer1KTokens: {
      input: 0.10,
      output: 0.40,
    },
    supportsFunctions: true,
    supportsVision: true,
    supportsWebSearch: true,
    supportsFileUpload: true,
    supportsReasoning: false,
    icon: '🌟',
  },
  {
    id: 'gemini-2.5-flash-preview-05-20',
    name: 'gemini-2.5-flash-preview-05-20',
    provider: 'google',
    displayName: 'Gemini 2.5 Flash',
    description: 'Google\'s first Flash model with thinking capabilities and 1M token context',
    maxTokens: 1000000,
    costPer1KTokens: {
      input: 0.15,
      output: 0.60,
    },
    supportsFunctions: true,
    supportsVision: true,
    supportsWebSearch: true,
    supportsFileUpload: true,
    supportsReasoning: true,
    icon: '🧠',
  },
  
  // Google Vertex AI Models (Enterprise with Native Search Grounding)
  {
    id: 'gemini-2.0-flash-exp-vertex',
    name: 'gemini-2.0-flash-exp',
    provider: 'google-vertex',
    displayName: 'Gemini 2.0 Flash (Vertex AI)',
    description: 'Google\'s model with native search grounding via Vertex AI',
    maxTokens: 1000000,
    costPer1KTokens: {
      input: 0.10,
      output: 0.40,
    },
    supportsFunctions: true,
    supportsVision: true,
    supportsWebSearch: true, // Native search grounding via Vertex AI
    supportsFileUpload: true,
    supportsReasoning: false,
    icon: '🌟',
  },
  {
    id: 'gemini-2.5-flash-vertex',
    name: 'gemini-2.5-flash-preview-05-20',
    provider: 'google-vertex',
    displayName: 'Gemini 2.5 Flash (Vertex AI)',
    description: 'Google\'s enterprise model with native search grounding and thinking capabilities',
    maxTokens: 1000000,
    costPer1KTokens: {
      input: 0.15,
      output: 0.60,
    },
    supportsFunctions: true,
    supportsVision: true,
    supportsWebSearch: true, // Native search grounding via Vertex AI
    supportsFileUpload: true,
    supportsReasoning: true,
    icon: '🧠',
  },
  
  // DeepSeek Models
  {
    id: 'deepseek-r1',
    name: 'deepseek-r1',
    provider: 'deepseek',
    displayName: 'DeepSeek R1',
    description: 'Reasoning model with reinforcement learning and 128K context (27x cheaper than o1)',
    maxTokens: 128000,
    costPer1KTokens: {
      input: 0.055,
      output: 0.219,
    },
    supportsFunctions: true,
    supportsVision: false,
    supportsWebSearch: false,
    supportsFileUpload: false,
    supportsReasoning: true,
    icon: '🐋',
  },
];

export const MODELS_BY_PROVIDER: Record<ModelProvider, ModelInfo[]> = {
  openai: AVAILABLE_MODELS.filter(m => m.provider === 'openai'),
  anthropic: AVAILABLE_MODELS.filter(m => m.provider === 'anthropic'),
  google: AVAILABLE_MODELS.filter(m => m.provider === 'google'),
  'google-vertex': AVAILABLE_MODELS.filter(m => m.provider === 'google-vertex'),
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
