// Error handling utilities for the plugin
export class ErrorHandler {
  static handleInitializationError(error: any): void {
    console.error('Plugin initialization failed:', error);
    
    figma.ui.postMessage({
      type: 'error',
      data: {
        error: 'Failed to initialize plugin',
        details: error.message,
        code: 'INITIALIZATION_ERROR',
        recoverable: false
      }
    });
  }

  static handleMessageError(error: any, originalMessage: any): void {
    console.error('Message handling failed:', error);
    
    figma.ui.postMessage({
      type: 'error',
      data: {
        error: 'Failed to process message',
        details: error.message,
        code: 'MESSAGE_ERROR',
        originalMessage: originalMessage?.type,
        recoverable: true
      }
    });
  }

  static handleExportError(error: any, context?: any): void {
    console.error('Export failed:', error);
    
    figma.ui.postMessage({
      type: 'export-error',
      data: {
        error: error.message || 'Export failed',
        details: error.stack,
        code: 'EXPORT_ERROR',
        context,
        recoverable: true
      }
    });
  }

  static handleAuthError(error: any): void {
    console.error('Authentication failed:', error);
    
    figma.ui.postMessage({
      type: 'error',
      data: {
        error: 'Authentication failed',
        details: error.message,
        code: 'AUTH_ERROR',
        recoverable: true
      }
    });
  }

  static handleNetworkError(error: any, endpoint?: string): void {
    console.error('Network error:', error);
    
    figma.ui.postMessage({
      type: 'error',
      data: {
        error: 'Network connection failed',
        details: error.message,
        code: 'NETWORK_ERROR',
        endpoint,
        recoverable: true
      }
    });
  }
}
