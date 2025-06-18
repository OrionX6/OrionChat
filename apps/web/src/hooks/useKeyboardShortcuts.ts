import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  action: string;
  key: string;
  mac: string;
  windows: string;
  handler: () => void;
}

// Detect if user is on Mac
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const isInInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
    
    const modifierKey = isMac ? event.metaKey : event.ctrlKey;
    const key = event.key.toLowerCase();
    
    // Allow certain shortcuts to work even in input fields
    // But block others when typing to prevent interference
    if (isInInputField) {
      // Allow search (Cmd/Ctrl+K) and new chat (Cmd/Ctrl+Shift+O) in input fields
      const isSearchShortcut = key === 'k' && modifierKey && !event.shiftKey && !event.altKey;
      const isNewChatShortcut = key === 'o' && modifierKey && event.shiftKey && !event.altKey;
      
      if (!isSearchShortcut && !isNewChatShortcut) {
        return;
      }
    }
    

    for (const shortcut of shortcuts) {
      
      // Handle different key combinations based on action
      let shouldTrigger = false;
      
      if (shortcut.action === 'search' && key === 'k' && modifierKey && !event.shiftKey && !event.altKey) {
        shouldTrigger = true;
      } else if (shortcut.action === 'new-chat' && key === 'o' && modifierKey && event.shiftKey && !event.altKey) {
        shouldTrigger = true;
      } else if (shortcut.action === 'toggle-sidebar' && key === 'b' && modifierKey && !event.shiftKey && !event.altKey) {
        shouldTrigger = true;
      }
      
      if (shouldTrigger) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.handler();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    isMac,
    getShortcutDisplay: (shortcut: KeyboardShortcut) => isMac ? shortcut.mac : shortcut.windows
  };
}

// Utility function to get platform-specific modifier key symbol
export const getModifierKey = () => isMac ? '⌘' : 'Ctrl';
export const getShiftKey = () => 'Shift';
export const isPlatformMac = () => isMac;