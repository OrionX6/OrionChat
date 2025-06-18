"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, Zap, Eye, Wrench, Search, FileText, Brain, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AVAILABLE_MODELS, 
  ModelInfo, 
  ModelProvider
} from "@/lib/constants/models";
import { useEnabledModels } from "@/contexts/EnabledModelsContext";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (provider: ModelProvider, modelName: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, disabled = false, compact = false }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { getEnabledModels } = useEnabledModels();
  
  const enabledModels = getEnabledModels();
  const currentModel = enabledModels.find(m => m.name === selectedModel) || AVAILABLE_MODELS.find(m => m.name === selectedModel);
  
  // If the current model is not enabled, automatically switch to the first enabled model
  useEffect(() => {
    if (enabledModels.length > 0 && !enabledModels.find(m => m.name === selectedModel)) {
      const firstEnabledModel = enabledModels[0];
      onModelChange(firstEnabledModel.provider, firstEnabledModel.name);
    }
  }, [enabledModels, selectedModel, onModelChange]);
  
  const handleModelSelect = (model: ModelInfo) => {
    onModelChange(model.provider, model.name);
    setOpen(false);
  };

  const getCapabilityIcon = (type: string) => {
    switch (type) {
      case 'vision': return <Eye className="h-4 w-4" />;
      case 'websearch': return <Globe className="h-4 w-4" />;
      case 'upload': return <FileText className="h-4 w-4" />;
      case 'reasoning': return <Brain className="h-4 w-4" />;
      case 'functions': return <Wrench className="h-4 w-4" />;
      default: return null;
    }
  };

  const getCapabilityTooltip = (type: string) => {
    switch (type) {
      case 'vision': return 'Image upload and analysis';
      case 'websearch': return 'Web search capabilities';
      case 'upload': return 'File and document upload';
      case 'reasoning': return 'Advanced reasoning and problem solving';
      case 'functions': return 'Function calling and tools';
      default: return '';
    }
  };

  const renderModelItem = (model: ModelInfo) => {
    const isSelected = model.name === selectedModel;
    const capabilities = [];
    
    if (model.supportsVision) capabilities.push('vision');
    if (model.supportsWebSearch) capabilities.push('websearch');
    if (model.supportsFileUpload) capabilities.push('upload');
    if (model.supportsReasoning) capabilities.push('reasoning');
    
    return (
      <DropdownMenuItem
        key={model.id}
        onClick={() => handleModelSelect(model)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 border-l-2 border-l-transparent hover:border-l-primary/50"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{model.icon}</span>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{model.displayName}</span>
            {model.provider === 'deepseek' && (
              <span className="text-xs text-muted-foreground">DeepSeek</span>
            )}
          </div>
          {isSelected && <Check className="h-4 w-4 text-primary ml-2" />}
        </div>
        
        <div className="flex items-center gap-2">
          <TooltipProvider>
            {capabilities.map((capability) => (
              <Tooltip key={capability}>
                <TooltipTrigger asChild>
                  <div className="p-1.5 rounded bg-muted/50 hover:bg-muted cursor-help">
                    {getCapabilityIcon(capability)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getCapabilityTooltip(capability)}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={`flex items-center gap-2 justify-between hover:bg-muted/50 ${
            compact
              ? "min-w-[140px] h-8 px-2 text-sm"
              : "min-w-[200px]"
          }`}
        >
          <div className="flex items-center gap-2">
            {!compact && <Zap className="h-4 w-4" />}
            <span className="truncate">
              {currentModel ? currentModel.displayName : 'Select Model'}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-[450px] max-h-[600px] overflow-y-auto bg-background border border-border">
        
        <div className="py-2">
          {enabledModels.map(renderModelItem)}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
