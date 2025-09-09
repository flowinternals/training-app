'use client';

import { useEffect } from 'react';

export default function ErrorHandler() {
  useEffect(() => {
    // Suppress Cross-Origin-Opener-Policy errors that are harmless but annoying
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args[0]?.toString() || '';
      
      // Suppress specific harmless errors
      if (
        message.includes('Cross-Origin-Opener-Policy policy would block the window.closed call') ||
        message.includes('popup.ts:302') ||
        message.includes('window.closed')
      ) {
        // Suppress these errors silently
        return;
      }
      
      // Log all other errors normally
      originalConsoleError.apply(console, args);
    };

    // Cleanup function to restore original console.error
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return null; // This component doesn't render anything
}
