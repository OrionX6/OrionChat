// Script to apply theme immediately before React hydration to prevent flash
export const themeScript = `
(function() {
  try {
    // Get stored theme values
    const baseTheme = localStorage.getItem('base-theme') || 'system';
    const colorTheme = localStorage.getItem('color-theme') || 'default';
    const fontFamily = localStorage.getItem('font-family') || 'sans';
    
    const root = document.documentElement;
    const body = document.body;
    
    // Safety check for body
    if (!body) return;
    
    // Remove any existing theme classes
    root.classList.remove('light', 'dark');
    root.classList.remove('theme-default', 'theme-ocean', 'theme-forest', 'theme-sunset', 'theme-lavender', 'theme-rose');
    body.classList.remove('font-sans', 'font-serif', 'font-mono', 'font-playfair', 'font-poppins', 'font-crimson');
    
    // Handle legacy font names
    const legacyFontMappings = {
      'inter': 'sans',
      'roboto': 'poppins', 
      'opensans': 'poppins'
    };
    const mappedFont = legacyFontMappings[fontFamily] || fontFamily;
    
    // Determine resolved base theme
    let resolvedTheme = 'dark';
    if (baseTheme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolvedTheme = baseTheme;
    }
    
    // Apply themes immediately
    root.classList.add(resolvedTheme);
    root.classList.add('theme-' + colorTheme);
    body.classList.add('font-' + mappedFont);
    
  } catch (error) {
    // Fallback to defaults if anything fails
    document.documentElement.classList.add('dark', 'theme-default');
    document.body.classList.add('font-sans');
  }
})();
`;