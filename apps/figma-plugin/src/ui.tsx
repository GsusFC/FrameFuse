import { render, Container, Text, Button, Textbox, Dropdown, DropdownOption, Checkbox, LoadingIndicator, VerticalSpace, Divider } from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'
import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'

// Componentes UI mejorados
import { Header, APIKeyPage, FrameGrid, ExportSettings } from './components'
import { ExportButton } from './components/ExportButton'
import { WEB_APP_ORIGIN, API_BASE, getSlideshowUrl } from './config'

interface Frame {
  id: string
  name: string
  width: number
  height: number
  complexity: 'low' | 'medium' | 'high'
  estimatedSize: string
  isValidForExport: boolean
  order: number
  selectionIndex: number
}

interface AuthState {
  authenticated: boolean
  loading: boolean
  user?: {
    name: string
    email: string
    plan: string
  }
  error?: string
  requiresSetup?: boolean
}

interface ExportProgress {
  stage: string
  current: number
  total: number
  message: string
  percentage: number
}

interface ExportResult {
  success: boolean
  exportId: string
  sessionId?: string
  projectId?: string
  projectUrl?: string
  framesExported: number
  framesTotal: number
  failedFrames?: string[]
  uploadResult?: {
    sessionId: string
    projectId: string
    projectUrl: string
    framesImported: number
    message: string
  }
  error?: string
  message?: string
}

interface ExportProgressState {
  stage: 'thumbnails' | 'uploading' | 'creating' | 'completed' | 'error'
  current: number
  total: number
  message: string
  percentage: number
}

function Plugin() {
  const [authState, setAuthState] = useState<AuthState>({
    authenticated: false,
    loading: true
  })
  const [frames, setFrames] = useState<Frame[]>([])
  const [selectedFrames, setSelectedFrames] = useState<string[]>([])
  const [figmaSelection, setFigmaSelection] = useState<string[]>([]) // Frames seleccionados en Figma
  const [apiKey, setApiKey] = useState('')
  const [exportFormat, setExportFormat] = useState('JPG') // Changed to JPG for smaller file sizes
  const [exportScale, setExportScale] = useState('1') // Changed to 1x scale to reduce file size
  const [exportQuality, setExportQuality] = useState('0.8') // JPG quality (0.1-1.0)
  const [useAbsoluteBounds, setUseAbsoluteBounds] = useState(false) // Include effects and strokes
  const [contentsOnly, setContentsOnly] = useState(false) // Export contents only
  // These states are now handled internally by ExportButton
  // const [isExporting, setIsExporting] = useState(false)
  // const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  // const [exportProgressState, setExportProgressState] = useState<ExportProgressState | null>(null)
  // const [exportResult, setExportResult] = useState<ExportResult | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    // Set up message listeners
    on('auth-state-changed', (data: AuthState) => {
      console.log('🔐 Auth state changed in UI:', data)
      console.log('🔐 Setting auth state to:', data)
      setAuthState(data)
      console.log('🔐 Auth state set successfully')
    })

    on('frames-detected', (data: { frames: Frame[], figmaSelection?: string[] }) => {
      console.log('🖼️ UI: Frames detected, count:', data.frames?.length || 0)

      if (data.frames && data.frames.length > 0) {
        console.log('📋 UI: Frames received in order:')
        data.frames.forEach((f, i) => {
          console.log(`   ${i}: "${f.name}" (order: ${f.order}, selectionIndex: ${f.selectionIndex})`)
        })

        // Verify frames are in correct order before setting
        const sortedFrames = [...data.frames].sort((a, b) => {
          const indexA = a.selectionIndex ?? a.order ?? 999999
          const indexB = b.selectionIndex ?? b.order ?? 999999
          return indexA - indexB
        })

        console.log('📋 UI: Frames after sorting:')
        sortedFrames.forEach((f, i) => {
          console.log(`   ${i}: "${f.name}" (order: ${f.order}, selectionIndex: ${f.selectionIndex})`)
        })

        setFrames(sortedFrames)
      } else {
        setFrames([])
      }

      // Si hay selección de Figma, pre-seleccionar esos frames
      if (data.figmaSelection && data.figmaSelection.length > 0) {
        console.log('🎯 Figma selection detected:', data.figmaSelection)
        setFigmaSelection(data.figmaSelection)
        setSelectedFrames(data.figmaSelection)
      } else {
        setFigmaSelection([])
      }
    })

    // Export progress is now handled internally by ExportButton
    // No need for message listeners here anymore

    on('thumbnail-response', (data: any) => {
      console.log('🖼️ Thumbnail response received:', data)
      // The FrameGrid component will handle this via window message events
    })

    // Send UI ready message
    emit('ui-ready')
  }, [])

  const handleAuthenticate = () => {
    if (!apiKey.trim()) {
      console.log('⚠️ No API key provided')
      return
    }
    console.log('📤 Sending authenticate message with key:', apiKey)

    // Send via both methods to ensure compatibility
    emit('authenticate', { apiKey })

    // Also send via direct postMessage
    parent.postMessage({
      pluginMessage: {
        type: 'authenticate',
        apiKey: apiKey
      }
    }, '*')
  }

  const handleRefreshFrames = () => {
    parent.postMessage({
      pluginMessage: {
        type: 'detect-frames'
      }
    }, '*')
  }

  const handleFrameSelection = (frameId: string, checked: boolean) => {
    if (checked) {
      setSelectedFrames([...selectedFrames, frameId])
    } else {
      setSelectedFrames(selectedFrames.filter(id => id !== frameId))
    }
  }

  const handleSelectAll = () => {
    const validFrames = frames.filter(frame => frame.isValidForExport)
    setSelectedFrames(validFrames.map(frame => frame.id))
  }

  const handleClearAll = () => {
    setSelectedFrames([])
  }

  const handleExport = async () => {
    console.log('🚀 Export starting...')
    console.log('📋 Selected frames:', selectedFrames)

    if (selectedFrames.length === 0) {
      console.log('⚠️ Export validation failed')
      return
    }



    const settings = {
      format: exportFormat,
      scale: parseInt(exportScale),
      quality: parseFloat(exportQuality),
      useAbsoluteBounds: useAbsoluteBounds,
      contentsOnly: contentsOnly
    }

    console.log('📤 Sending export-frames message with settings:', settings)

    // Add a small delay to show the clicking feedback
    await new Promise(resolve => setTimeout(resolve, 300))

    // Use native Figma messaging system
    parent.postMessage({
      pluginMessage: {
        type: 'export-frames',
        frameIds: selectedFrames,
        settings: settings
      }
    }, '*')
  }

  const handleLogout = () => {
    emit('logout')

    // Reset all authentication and selection states
    setApiKey('')
    setSelectedFrames([])

    // Reset auth state to show API key page
    setAuthState({
      authenticated: false,
      loading: false
    })
  }

  const openExternalUrl = (url: string) => {
    console.log(`🔗 Emitting open-external-url event for: ${url}`)
    emit('open-external-url', { url })
  }

  const handleOpenProject = (url: string) => {
    console.log(`🌐 Opening project: ${url}`)

    // Ensure URL is properly formatted
    const finalUrl = url.startsWith('http') ? url : `https://${url}`

    try {
      openExternalUrl(finalUrl)
      console.log(`✅ Successfully opened: ${finalUrl}`)
    } catch (error) {
      console.error('❌ Failed to open external URL:', error)
      // Fallback: try to open in new window
      try {
        window.open(finalUrl, '_blank')
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError)
      }
    }
  }

  const handleOpenSlideshow = async (url: string, images?: { name: string; data: number[]; width?: number; height?: number }[]) => {
    console.log('🎬 Opening slideshow:', url)
    
    // Always try to open the window synchronously on user gesture to avoid popup blockers
    const finalUrl = url.startsWith('http') ? url : `https://${url}`
    let targetWindow: Window | null = null
    try {
      targetWindow = window.open(finalUrl, '_blank')
      if (!targetWindow) {
        console.warn('⚠️ Popup blocked or window handle not available, will try API upload fallback')
      } else {
        console.log('🪟 Opened target window for FrameFuse')
      }
    } catch (e) {
      console.error('❌ window.open failed, will try API upload fallback', e)
    }

    const useApiUpload = !targetWindow

    // If images are provided, generate FFZ and send via postMessage or upload via API as fallback
    if (images && images.length > 0) {
      console.log('📦 Generating FFZ file from images...')
      try {
        const { FFZGenerator } = await import('./utils/FFZGenerator')
        const frameData = images.map(img => ({
          name: img.name,
          data: new Uint8Array(img.data),
          width: img.width || 1920,
          height: img.height || 1080
        }))
        const ffzData = FFZGenerator.generateFFZ(frameData)
        console.log('✅ FFZ file generated, size:', ffzData.length, 'bytes')

        if (!useApiUpload && targetWindow) {
          // Use explicit target origin instead of wildcard
          let targetOrigin = 'https://frame-fuse-web.vercel.app'
          try { targetOrigin = new URL(finalUrl).origin } catch {}

          // Wait a bit for the page to be ready and send via postMessage
          setTimeout(async () => {
            try {
              console.log('📤 Sending FFZ to web app via postMessage', { targetOrigin, size: ffzData.length })
              targetWindow!.postMessage({ type: 'figma-ping', timestamp: Date.now() }, targetOrigin)
              setTimeout(async () => {
                const ok = await FFZGenerator.sendFFZToWebApp(ffzData, targetWindow as Window, targetOrigin)
                console.log('✅ FFZ postMessage result:', ok)
              }, 500)
            } catch (sendErr) {
              console.error('❌ Failed to send FFZ via postMessage, switching to API upload fallback:', sendErr)
              await uploadViaAPI(ffzData)
            }
          }, 400)
        } else {
          // Fallback: upload to API and open slideshow URL with sessionId
          await uploadViaAPI(ffzData)
        }
      } catch (error) {
        console.error('❌ Error generating FFZ for slideshow:', error)
      }
    }

    async function uploadViaAPI(ffzData: Uint8Array) {
      try {
        const payload = { ffzData: Array.from(ffzData) }
        const res = await fetch(`${API_BASE}/upload-ffz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
        const data = await res.json() as { sessionId: string; blobUrl: string }
        const sessionUrl = getSlideshowUrl(data.sessionId)
        console.log('🔗 Opening slideshow by session id:', { sessionId: data.sessionId, sessionUrl })
        try {
          window.open(sessionUrl, '_blank')
        } catch {
          parent.postMessage({ pluginMessage: { type: 'open-external-url', url: sessionUrl } }, '*')
        }
      } catch (e) {
        console.error('❌ API upload failed:', e)
        // As a last resort, if we still have a window reference and images, try raw images
        if (targetWindow && images?.length) {
          try {
            targetWindow.postMessage({
              type: 'figma-frames-import',
              data: { images, timestamp: Date.now() }
            }, '*')
          } catch {}
        }
      }
    }
  }

  const handleOpenSettings = () => {
    setIsSettingsOpen(true)
  }

  const handleCloseSettings = () => {
    setIsSettingsOpen(false)
  }

  if (authState.loading) {
    return (
      <Container space="medium">
        <VerticalSpace space="large" />
        <LoadingIndicator />
        <VerticalSpace space="medium" />
        <Text align="center">Loading FrameFuse Exporter...</Text>
        <VerticalSpace space="large" />
      </Container>
    )
  }

  // Auth UI disabled for local dev; render main UI regardless of auth state

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Header
        user={authState.user}
        onLogout={handleLogout}
        onOpenSettings={handleOpenSettings}
      />

      {/* Frame Grid */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <FrameGrid
          frames={frames}
          selectedFrames={selectedFrames}
          onFrameSelection={handleFrameSelection}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          figmaSelection={figmaSelection}
        />
      </div>

      {/* Export Button */}
      <div style={{
        borderTop: '1px solid #e5e7eb',
        padding: '16px',
        backgroundColor: '#ffffff'
      }}>

        {/* Export Button */}
        <ExportButton
          selectedFrames={selectedFrames}
          isAuthenticated={authState.authenticated}
          onExport={handleExport}
          onOpenSlideshow={handleOpenSlideshow}
        />

        {/* Info text */}
        {selectedFrames.length === 0 && (
          <Text style={{
            fontSize: '11px',
            color: '#6b7280',
            textAlign: 'center',
            marginTop: '8px'
          }}>
            Select frames above to enable export
          </Text>
        )}
      </div>

      {/* Export Settings Modal */}
      <ExportSettings
        exportFormat={exportFormat}
        exportScale={exportScale}
        exportQuality={exportQuality}
        useAbsoluteBounds={useAbsoluteBounds}
        contentsOnly={contentsOnly}
        onFormatChange={setExportFormat}
        onScaleChange={setExportScale}
        onQualityChange={setExportQuality}
        onUseAbsoluteBoundsChange={setUseAbsoluteBounds}
        onContentsOnlyChange={setContentsOnly}
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
      />
    </div>
  )
}

export default render(Plugin)
