import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { Button } from '@create-figma-plugin/ui'
import './ExportButton.css'
import { WEB_APP_ORIGIN } from '../config'

export interface ExportProgress {
  stage: 'preparing' | 'exporting' | 'uploading' | 'creating' | 'completed' | 'error'
  current: number
  total: number
  message: string
  percentage: number
  frameName?: string
}

interface ExportImageItem {
  name: string
  data: number[]
  width?: number
  height?: number
}

interface ExportResult {
  success: boolean
  slideshowUrl?: string
  projectUrl?: string
  sessionId?: string
  images?: ExportImageItem[]
  error?: string
  message?: string
}

interface ExportButtonProps {
  selectedFrames: string[]
  isAuthenticated: boolean
  onExport: () => void
  onOpenSlideshow: (url: string, images?: ExportImageItem[]) => void
}

export function ExportButton({
  selectedFrames,
  isAuthenticated,
  onExport,
  onOpenSlideshow
}: ExportButtonProps) {
  // Estados internos del botón
  const [buttonState, setButtonState] = useState<'idle' | 'clicking' | 'exporting' | 'completed' | 'opening' | 'error'>('idle')
  const [isHovered, setIsHovered] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Escuchar mensajes de progreso de exportación
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage
      if (!msg) return

      switch (msg.type) {
        case 'export-progress':
          console.log('📊 ExportButton received progress:', msg)
          const data = msg.data || msg
          setButtonState('exporting')
          setExportProgress({
            stage: data.stage || 'exporting',
            current: data.current || 0,
            total: data.total || 1,
            message: data.message || 'Processing...',
            percentage: data.percentage || Math.round(((data.current || 0) / (data.total || 1)) * 100),
            frameName: data.frameName
          })
          break

        case 'export-complete':
          console.log('✅ ExportButton received completion:', msg)
          const result = msg.data || msg
          setButtonState('completed')
          setExportProgress(null)
          setExportResult({
            success: true,
            slideshowUrl: result.projectUrl || `${WEB_APP_ORIGIN}/slideshow?sessionId=${result.sessionId}`,
            projectUrl: result.projectUrl,
            sessionId: result.sessionId,
            images: result.images
          })
          break

        case 'export-error':
          console.error('❌ ExportButton received error:', msg)
          const error = msg.data || msg
          setButtonState('error')
          setExportProgress(null)
          setErrorMessage(error.error || error.message || 'Export failed')
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])
  
  // Estado completado - botón para abrir slideshow
  if (buttonState === 'completed' && exportResult?.slideshowUrl) {
    const handleOpenSlideshow = () => {
      console.log('🎬 Opening slideshow and preparing reset...')
      setButtonState('opening')
      onOpenSlideshow(exportResult.slideshowUrl!, exportResult.images)
      
      // Reset después de 2 segundos para permitir nueva exportación
      setTimeout(() => {
        console.log('🔄 Resetting to idle state for next export')
        setButtonState('idle')
        setExportResult(null)
        setExportProgress(null)
        setErrorMessage(null)
      }, 2000)
    }

    return (
      <Button
        fullWidth
        onClick={handleOpenSlideshow}
        style={{
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          minHeight: '40px',
          fontWeight: '600',
          color: 'white',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#059669'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#10b981'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(0.98)'
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px) scale(1)'
        }}
      >
        Open in FrameFuse
      </Button>
    )
  }

  // Resto del componente (idle/exporting/error) se mantiene igual


  if (selectedFrames.length === 0) {
    return (
      <Button fullWidth disabled title="Select frames to export">Export</Button>
    )
  }

  if (buttonState === 'exporting' && exportProgress) {
    return (
      <Button fullWidth disabled>{`${exportProgress.message} ${exportProgress.percentage}%`}</Button>
    )
  }

  if (buttonState === 'error') {
    return (
      <Button fullWidth onClick={onExport} title={errorMessage || undefined}>
        Retry Export
      </Button>
    )
  }

  return (
    <Button fullWidth onClick={onExport}>Export</Button>
  )
}
