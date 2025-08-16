// FrameFuse API service for backend communication
import { APIKeyValidation, UserInfo, FrameFuseUploadResponse, FrameExportResult } from '../types';
import { ErrorHandler } from '../utils/ErrorHandler';
import { API_BASE, getSlideshowUrl } from '../config'

export class FrameFuseAPIService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    // Use local web app server in development
    this.baseURL = API_BASE
    this.timeout = 30000; // 30 seconds
  }

  async validateAPIKey(apiKey: string): Promise<APIKeyValidation> {
    try {
      console.log('🔍 Validating API key with FrameFuse...');

      // Add network check first
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('No internet connection')
      }

      const response = await this.makeRequest('/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Plugin-Version': '2.0.0',
          'X-Plugin-Source': 'figma'
        },
        body: JSON.stringify({
          source: 'figma-plugin',
          version: '2.0.0'
        })
      });

      if (response.valid) {
        console.log('✅ API key validation successful');
        return {
          valid: true,
          user: response.user,
          expiresAt: response.expiresAt ? new Date(response.expiresAt) : undefined
        };
      } else {
        console.log('❌ API key validation failed');
        return {
          valid: false,
          error: response.error || 'Invalid API key'
        };
      }

    } catch (error) {
      console.error('❌ API key validation error:', error);
      return {
        valid: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  async renewAPIKey(apiKey: string): Promise<any> {
    try {
      console.log('🔄 Attempting API key renewal...');
      
      const response = await this.makeRequest('/auth/renew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          source: 'figma-plugin',
          autoRenewal: true
        })
      });

      if (response.success) {
        console.log('✅ API key renewal successful');
        return {
          success: true,
          newApiKey: response.newApiKey,
          user: response.user,
          expiresAt: new Date(response.expiresAt)
        };
      } else {
        return {
          success: false,
          error: response.error || 'Renewal failed'
        };
      }

    } catch (error) {
      console.error('❌ API key renewal error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  async uploadFrames(
    frameResults: FrameExportResult[],
    settings: any
  ): Promise<FrameFuseUploadResponse> {
    try {
      console.log(`📤 Preparing ${frameResults.length} frames for local FrameFuse import...`);

      const sessionId = `session_${Date.now()}`;

      // Filtrar y ordenar por orden de selección para mantener la secuencia del usuario
      const successfulFrames = frameResults
        .filter((r) => r.success && r.imageData)
        .sort((a, b) => {
          const ia = (a.selectionIndex ?? a.order ?? 999999)
          const ib = (b.selectionIndex ?? b.order ?? 999999)
          return ia - ib
        })

      if (successfulFrames.length === 0) {
        throw new Error('No valid frames to process')
      }

      // Mapear a estructura de archivos esperada por el tipo de respuesta
      const files = successfulFrames.map((r, idx) => {
        const cleanName = r.frameName.replace(/[^a-zA-Z0-9]/g, '_')
        const base = `${String(idx + 1).padStart(2, '0')}_${cleanName}`
        const ext = (settings?.format || 'PNG').toLowerCase() === 'jpg' ? 'jpg' : 'png'
        return {
          id: `${sessionId}_${idx + 1}`,
          name: `${base}.${ext}`,
          order: idx,
          dimensions: {
            width: r.metadata?.width ?? 0,
            height: r.metadata?.height ?? 0
          }
        }
      })

      const slideshowUrl = getSlideshowUrl(sessionId)

      // Respuesta local simulada (sin llamadas a red)
      const response: FrameFuseUploadResponse = {
        success: true,
        sessionId,
        projectId: sessionId,
        projectUrl: slideshowUrl,
        framesImported: files.length,
        files,
        defaultSettings: {
          transitions: [{
            type: 'fade',
            duration: 1000
          }],
          frameDurations: [3000],
          exportSettings: {
            quality: 'high',
            resolution: '1920x1080',
            fps: 30,
            format: 'mp4'
          }
        },
        message: `${files.length} frames prepared locally`
      }

      console.log('✅ Frames prepared locally for FrameFuse:', response)
      return response

    } catch (error) {
      console.error('❌ Local frame preparation error:', error);
      ErrorHandler.handleNetworkError(error, '/figma/import');
      throw error;
    }
  }

  async updateProjectSettings(projectId: string, settings: any, apiKey: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/figma/project/${projectId}/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings })
      });

      return response;

    } catch (error) {
      console.error('❌ Failed to update project settings:', error);
      throw error;
    }
  }

  private async uploadFramesInBatches(
    frameResults: FrameExportResult[],
    settings: any,
    sessionId: string,
    batchSize: number
  ): Promise<FrameFuseUploadResponse> {
    // Método conservado por compatibilidad pero no utilizado en modo local
    // Para evitar romper flujos existentes, delega a uploadFrames
    return this.uploadFrames(frameResults, settings)
  }

  private async makeRequest(endpoint: string, options: RequestInit): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      console.log(`🌐 Making request to: ${url}`);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - please check your connection')), this.timeout);
      });

      // Create the fetch promise
      const fetchPromise = fetch(url, options);

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Request timeout - please check your connection');
      }

      throw error;
    }
  }

  private getErrorMessage(error: any): string {
    if (error.message) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    return 'An unexpected error occurred';
  }

  // Utility method to check API health
  async checkAPIHealth(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/health', {
        method: 'GET'
      })
      
      return response.status === 'ok';
    } catch (error) {
      console.warn('⚠️ API health check failed:', error);
      return false;
    }
  }
}
