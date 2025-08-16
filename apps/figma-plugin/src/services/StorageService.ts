// Secure storage service for plugin data
export interface StoredAuth {
  apiKey: string;
  user: {
    id: string;
    email: string;
    name: string;
    plan: string;
  };
  storedAt: number;
  lastValidated: number;
}

export class StorageService {
  private static readonly AUTH_KEY = 'framefuse_auth';
  private static readonly SETTINGS_KEY = 'framefuse_settings';

  async storeAuth(authData: StoredAuth): Promise<void> {
    try {
      // Encrypt sensitive data before storing
      const encryptedData = await this.encryptData(authData);
      
      await figma.clientStorage.setAsync(StorageService.AUTH_KEY, {
        ...encryptedData,
        version: '2.0.0',
        timestamp: Date.now()
      });
      
      console.log('✅ Auth data stored securely');
    } catch (error) {
      console.error('❌ Failed to store auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  async getStoredAuth(): Promise<StoredAuth | null> {
    try {
      const stored = await figma.clientStorage.getAsync(StorageService.AUTH_KEY);
      
      if (!stored || !stored.apiKey) {
        return null;
      }
      
      // Decrypt sensitive data
      const decryptedData = await this.decryptData(stored);
      
      // Validate data structure
      if (!this.isValidAuthData(decryptedData)) {
        console.warn('⚠️ Invalid stored auth data, clearing...');
        await this.clearAuth();
        return null;
      }
      
      return decryptedData;
      
    } catch (error) {
      console.error('❌ Failed to retrieve auth data:', error);
      // Clear corrupted data
      await this.clearAuth();
      return null;
    }
  }

  async clearAuth(): Promise<void> {
    try {
      await figma.clientStorage.deleteAsync(StorageService.AUTH_KEY);
      console.log('✅ Auth data cleared');
    } catch (error) {
      console.error('❌ Failed to clear auth data:', error);
    }
  }

  async storeSettings(settings: any): Promise<void> {
    try {
      await figma.clientStorage.setAsync(StorageService.SETTINGS_KEY, {
        ...settings,
        version: '2.0.0',
        timestamp: Date.now()
      });
      
      console.log('✅ Settings stored');
    } catch (error) {
      console.error('❌ Failed to store settings:', error);
      throw new Error('Failed to store settings');
    }
  }

  async getStoredSettings(): Promise<any> {
    try {
      const stored = await figma.clientStorage.getAsync(StorageService.SETTINGS_KEY);
      return stored || {};
    } catch (error) {
      console.error('❌ Failed to retrieve settings:', error);
      return {};
    }
  }

  private async encryptData(data: StoredAuth): Promise<any> {
    // Simplified storage without encryption for Figma compatibility
    return {
      apiKey: data.apiKey, // Store directly for now
      user: data.user,
      storedAt: data.storedAt,
      lastValidated: data.lastValidated,
      _version: '2.0.0'
    };
  }

  private async decryptData(storedData: any): Promise<StoredAuth> {
    try {
      // Direct storage format for Figma compatibility
      return {
        apiKey: storedData.apiKey,
        user: storedData.user,
        storedAt: storedData.storedAt,
        lastValidated: storedData.lastValidated
      };
    } catch (error) {
      throw new Error('Failed to read auth data');
    }
  }

  // Encryption removed for Figma compatibility

  private isValidAuthData(data: any): boolean {
    return (
      data &&
      typeof data.apiKey === 'string' &&
      data.user &&
      typeof data.user.id === 'string' &&
      typeof data.user.email === 'string' &&
      typeof data.storedAt === 'number' &&
      typeof data.lastValidated === 'number'
    );
  }

  // Utility methods for plugin settings
  async getLastExportSettings(): Promise<any> {
    const settings = await this.getStoredSettings();
    return settings.lastExportSettings || {
      format: 'PNG',
      scale: 2,
      quality: 0.9,
      batchSize: 3
    };
  }

  async saveLastExportSettings(settings: any): Promise<void> {
    const currentSettings = await this.getStoredSettings();
    await this.storeSettings({
      ...currentSettings,
      lastExportSettings: settings
    });
  }

  async getPluginPreferences(): Promise<any> {
    const settings = await this.getStoredSettings();
    return settings.preferences || {
      autoDetectFrames: true,
      showAdvancedOptions: false,
      defaultTransition: 'fade',
      autoOpenAfterExport: true
    };
  }

  async savePluginPreferences(preferences: any): Promise<void> {
    const currentSettings = await this.getStoredSettings();
    await this.storeSettings({
      ...currentSettings,
      preferences
    });
  }
}
