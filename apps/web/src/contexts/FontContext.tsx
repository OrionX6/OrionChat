"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export type FontFamily = 'sans' | 'serif' | 'mono' | 'inter' | 'roboto' | 'opensans';

interface FontContextType {
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

interface FontProviderProps {
  children: React.ReactNode;
  defaultFont?: FontFamily;
}

export function FontProvider({ 
  children, 
  defaultFont = 'sans'
}: FontProviderProps) {
  const [fontFamily, setFontFamily] = useState<FontFamily>(defaultFont);

  useEffect(() => {
    const body = window.document.body;

    // Remove previous font classes
    body.classList.remove('font-sans', 'font-serif', 'font-mono', 'font-inter', 'font-roboto', 'font-opensans');

    // Apply font class
    body.classList.add(`font-${fontFamily}`);

    // Debug logging
    console.log('Font changed to:', fontFamily);
    console.log('Body classes:', body.className);

    // Store in localStorage
    localStorage.setItem('font-family', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    // Load from localStorage on mount
    const storedFont = localStorage.getItem('font-family') as FontFamily;
    
    if (storedFont) {
      setFontFamily(storedFont);
    }
  }, []);

  const value = {
    fontFamily,
    setFontFamily,
  };

  return (
    <FontContext.Provider value={value}>
      {children}
    </FontContext.Provider>
  );
}

export const useFont = () => {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
};
