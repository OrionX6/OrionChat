"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ColorTheme = 'default' | 'ocean' | 'forest' | 'sunset' | 'lavender' | 'rose';
export type BaseTheme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  baseTheme: BaseTheme;
  colorTheme: ColorTheme;
  setBaseTheme: (theme: BaseTheme) => void;
  setColorTheme: (theme: ColorTheme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultBaseTheme?: BaseTheme;
  defaultColorTheme?: ColorTheme;
}

export function ThemeProvider({ 
  children, 
  defaultBaseTheme = 'system',
  defaultColorTheme = 'default'
}: ThemeProviderProps) {
  const [baseTheme, setBaseTheme] = useState<BaseTheme>(defaultBaseTheme);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(defaultColorTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove previous theme classes
    root.classList.remove('light', 'dark');
    root.classList.remove('theme-default', 'theme-ocean', 'theme-forest', 'theme-sunset', 'theme-lavender', 'theme-rose');
    
    // Determine resolved theme
    let resolved: 'light' | 'dark' = 'dark';
    if (baseTheme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = baseTheme;
    }
    
    setResolvedTheme(resolved);
    
    // Apply base theme
    root.classList.add(resolved);
    
    // Apply color theme
    root.classList.add(`theme-${colorTheme}`);
    
    // Store in localStorage
    localStorage.setItem('base-theme', baseTheme);
    localStorage.setItem('color-theme', colorTheme);
  }, [baseTheme, colorTheme]);

  useEffect(() => {
    // Load from localStorage on mount
    const storedBaseTheme = localStorage.getItem('base-theme') as BaseTheme;
    const storedColorTheme = localStorage.getItem('color-theme') as ColorTheme;
    
    if (storedBaseTheme) {
      setBaseTheme(storedBaseTheme);
    }
    if (storedColorTheme) {
      setColorTheme(storedColorTheme);
    }
  }, []);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (baseTheme === 'system') {
        const resolved = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(resolved);
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(resolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [baseTheme]);

  const value = {
    baseTheme,
    colorTheme,
    setBaseTheme,
    setColorTheme,
    resolvedTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
