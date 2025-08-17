// Shared types between plugin and UI

export interface DetectedFrame {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  visible: boolean;
  locked: boolean;
  type: 'FRAME';
  order: number;
  selectionIndex: number; // Index based on user selection order
  selected: boolean;
  metadata?: FrameMetadata;
  analysis?: FrameAnalysis;
  estimatedSize: string;
  complexity: 'low' | 'medium' | 'high';
  aspectRatio: number;
  isValidForExport: boolean;
}

export interface FrameMetadata {
  fills: readonly Paint[];
  effects: readonly Effect[];
  cornerRadius: number | PluginAPI['mixed'];
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode: 'FIXED' | 'AUTO';
  counterAxisSizingMode: 'FIXED' | 'AUTO';
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  itemSpacing: number;
  childrenCount: number;
  hasImages: boolean;
  hasText: boolean;
  hasVectors: boolean;
}

export interface FrameAnalysis {
  complexity: number;
  contentTypes: string[];
  performance: 'fast' | 'medium' | 'slow';
  nodeCount: number;
  hasTransparentBackground: boolean;
  dominantColors: string[];
  estimatedProcessingTime: number;
}

export interface ExportSettings {
  format: 'PNG' | 'JPG';
  scale: 1 | 2 | 3 | 4;
  quality: number; // 0.1 - 1.0 for JPG
  batchSize: number; // 1-5
  useAbsoluteBounds: boolean;
  contentsOnly: boolean;
}

export interface ExportProgress {
  stage: 'preparing' | 'exporting' | 'uploading' | 'complete';
  current: number;
  total: number;
  message: string;
  frameName?: string;
  exportId: string;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface ExportResult {
  success: boolean;
  exportId: string;
  sessionId?: string;
  projectId?: string;
  projectUrl?: string;
  framesExported: number;
  framesTotal: number;
  failedFrames?: string[];
  uploadResult?: any;
  exportTime: number;
  settings: ExportSettings;
  error?: string;
}

export interface FrameExportResult {
  success: boolean;
  frameId: string;
  frameName: string;
  imageData?: Uint8Array;
  metadata?: any;
  order: number;
  selectionIndex: number; // Index based on user selection order
  exportTime: number;
  fileSize?: number;
  error?: string;
}

export interface AuthState {
  authenticated: boolean;
  loading: boolean;
  user?: UserInfo;
  apiKey?: string;
  expiresAt?: Date;
  requiresSetup?: boolean;
  expired?: boolean;
  error?: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  plan: string;
  permissions?: string[];
  usage?: {
    monthly_exports: number;
    monthly_limit: number;
  };
}

export interface APIKeyValidation {
  valid: boolean;
  user?: UserInfo;
  expiresAt?: Date;
  canRenew?: boolean;
  error?: string;
}

export interface PluginMessage {
  type: string;
  data?: any;
}

// Plugin-specific message types
export type PluginMessageType = 
  | 'ui-ready'
  | 'plugin-ready'
  | 'detect-frames'
  | 'frames-detected'
  | 'authenticate'
  | 'auth-state-changed'
  | 'export-frames'
  | 'export-progress'
  | 'export-complete'
  | 'export-error'
  | 'export-cancelled'
  | 'validate-auth'
  | 'close-plugin'
  | 'open-external-url'
  | 'open-slideshow-with-ffz'
  | 'open-slideshow-with-images'
  | 'error';

// FrameFuse API types
export interface FrameFuseUploadResponse {
  success: boolean;
  sessionId: string;
  projectId: string;
  projectUrl: string;
  framesImported: number;
  files: Array<{
    id: string;
    name: string;
    order: number;
    dimensions: {
      width: number;
      height: number;
    };
  }>;
  defaultSettings: {
    transitions: Array<{
      type: string;
      duration: number;
      fromFrameId?: string;
      toFrameId?: string;
    }>;
    frameDurations: number[];
    exportSettings: {
      quality: string;
      resolution: string;
      fps: number;
      format: string;
    };
  };
  message: string;
}
