import { h } from 'preact'
import { useState } from 'preact/hooks'
import { Text, Button, Dropdown, VerticalSpace } from '@create-figma-plugin/ui'

interface ExportSettingsProps {
  exportFormat: string
  exportScale: string
  exportQuality: string
  useAbsoluteBounds?: boolean
  contentsOnly?: boolean
  onFormatChange: (value: string) => void
  onScaleChange: (value: string) => void
  onQualityChange: (value: string) => void
  onUseAbsoluteBoundsChange?: (value: boolean) => void
  onContentsOnlyChange?: (value: boolean) => void
  isOpen: boolean
  onClose: () => void
}

export function ExportSettings({
  exportFormat,
  exportScale,
  exportQuality,
  useAbsoluteBounds = false,
  contentsOnly = false,
  onFormatChange,
  onScaleChange,
  onQualityChange,
  onUseAbsoluteBoundsChange,
  onContentsOnlyChange,
  isOpen,
  onClose
}: ExportSettingsProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          width: '320px',
          maxWidth: '90vw',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <Text style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
            ⚙️ Export Settings
          </Text>
          <Button
            secondary
            onClick={onClose}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              minHeight: '24px'
            }}
          >
            ✕
          </Button>
        </div>

        {/* Settings */}
        <div style={{ marginBottom: '20px' }}>
          {/* Format */}
          <div style={{ marginBottom: '16px' }}>
            <Text style={{ 
              fontSize: '12px', 
              fontWeight: '500', 
              color: '#374151',
              marginBottom: '6px',
              display: 'block'
            }}>
              Format
            </Text>
            <select
              value={exportFormat}
              onChange={(e) => onFormatChange((e.target as HTMLSelectElement).value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="PNG">PNG (Lossless)</option>
              <option value="JPG">JPG (Smaller files)</option>
            </select>
          </div>

          {/* Scale */}
          <div style={{ marginBottom: '16px' }}>
            <Text style={{ 
              fontSize: '12px', 
              fontWeight: '500', 
              color: '#374151',
              marginBottom: '6px',
              display: 'block'
            }}>
              Scale
            </Text>
            <select
              value={exportScale}
              onChange={(e) => onScaleChange((e.target as HTMLSelectElement).value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="1">1x (Recommended)</option>
              <option value="2">2x (High DPI)</option>
              <option value="3">3x (Ultra High DPI)</option>
            </select>
          </div>

          {/* Quality for JPG */}
          {exportFormat === 'JPG' && (
            <div style={{ marginBottom: '16px' }}>
              <Text style={{ 
                fontSize: '12px', 
                fontWeight: '500', 
                color: '#374151',
                marginBottom: '6px',
                display: 'block'
              }}>
                Quality
              </Text>
              <select
                value={exportQuality}
                onChange={(e) => onQualityChange((e.target as HTMLSelectElement).value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '12px',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="0.6">60% (Smaller files)</option>
                <option value="0.8">80% (Recommended)</option>
                <option value="0.9">90% (High quality)</option>
                <option value="1.0">100% (Maximum)</option>
              </select>
            </div>
          )}


        </div>



        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            secondary
            fullWidth
            onClick={onClose}
            style={{ fontSize: '12px' }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            onClick={onClose}
            style={{
              backgroundColor: '#ec4899',
              borderColor: '#ec4899',
              fontSize: '12px'
            }}
          >
            Apply Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
