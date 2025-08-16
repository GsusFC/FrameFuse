// FFZ (FrameFuse Zip) file generator utility
import { zipSync, strToU8 } from 'fflate';

export interface FFZProjectData {
  version: number;
  fps?: number;
  width?: number;
  height?: number;
  clips: Array<{
    id: string;
    filename: string;
    width: number;
    height: number;
    durationMs?: number;
    transitionAfter?: { pluginId: string; durationMs: number };
  }>;
}

export interface FrameImageData {
  name: string;
  data: Uint8Array;
  width: number;
  height: number;
}

export class FFZGenerator {
  static generateFFZ(frames: FrameImageData[], settings?: any): Uint8Array {
    const clips: FFZProjectData['clips'] = frames.map((frame, index) => {
      const hasExt = /\.[a-z0-9]+$/i.test(frame.name);
      const filename = hasExt ? frame.name : `${frame.name}.png`;
      return {
        id: `clip_${index + 1}`,
        filename,
        width: frame.width,
        height: frame.height,
        durationMs: 3000, // Default 3 segundos por frame
        transitionAfter: {
          pluginId: 'fade',
          durationMs: 500 // Transición por defecto de 500ms
        }
      };
    });

    const project: FFZProjectData = {
      version: 1,
      fps: 30,
      width: frames[0]?.width || 1920,
      height: frames[0]?.height || 1080,
      clips
    };

    // Prepare files for zip
    const filesToZip: Record<string, Uint8Array> = {};

    // Add project.json
    filesToZip['project.json'] = strToU8(JSON.stringify(project, null, 2));

    // Add image files
    frames.forEach((frame, index) => {
      const hasExt = /\.[a-z0-9]+$/i.test(frame.name);
      const filename = hasExt ? frame.name : `${frame.name}.png`;
      const path = `images/${filename}`;
      filesToZip[path] = frame.data;
    });

    console.log('📦 Creating FFZ file with:', {
      projectConfig: project,
      imageCount: frames.length,
      fileNames: Object.keys(filesToZip)
    });

    // Create zip file
    const zipData = zipSync(filesToZip, {
      level: 6, // Compression level
      mem: 8    // Memory level
    });

    console.log(`✅ FFZ file generated, size: ${zipData.length} bytes`);
    return zipData;
  }

  static async sendFFZToWebApp(
    ffzData: Uint8Array,
    targetWindow: Window,
    targetOrigin: string = '*'
  ): Promise<boolean> {
    try {
      console.log('📤 Sending FFZ file to web app...', { targetOrigin });
      
      // Convert Uint8Array to regular array for postMessage
      const ffzArray = Array.from(ffzData);
      
      // Send message with FFZ data
      targetWindow.postMessage({
        type: 'figma-ffz-import',
        data: {
          ffzData: ffzArray,
          timestamp: Date.now(),
          source: 'figma-plugin'
        }
      }, targetOrigin); // Target web app origin (dynamic in dev)

      console.log('✅ FFZ data sent to web app');
      return true;
    } catch (error) {
      console.error('❌ Failed to send FFZ to web app:', error);
      return false;
    }
  }
}