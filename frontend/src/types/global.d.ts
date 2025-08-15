/**
 * Global Type Declarations
 * 
 * This file overrides global window methods to prevent accidental usage
 * and provide better TypeScript support for our custom dialog system.
 */

declare global {
  interface Window {
    /**
     * @deprecated Use ConfirmDialog component instead
     * This function is disabled in the meditation app.
     */
    confirm: (message?: string) => false;
    
    /**
     * @deprecated Use Alert component instead  
     * This function is disabled in the meditation app.
     */
    alert: (message?: any) => void;
    
    // Keep references to original functions if needed for debugging
    originalConfirm?: (message?: string) => boolean;
    originalAlert?: (message?: any) => void;
    
    // Development helper
    __showDialogHelp?: () => void;
  }
}

// Global functions are also disabled
declare function confirm(message?: string): false;
declare function alert(message?: any): void;

export {};