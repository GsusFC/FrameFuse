import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { Text, Button, VerticalSpace } from '@create-figma-plugin/ui'

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

interface SuccessPageProps {
  result: ExportResult
  onOpenProject: (url: string) => void
  onStartNew: () => void
}

export function SuccessPage({ result, onOpenProject, onStartNew }: SuccessPageProps) {
  const [countdown, setCountdown] = useState(5)
  const [autoRedirect, setAutoRedirect] = useState(true)

  const projectUrl = result.projectUrl || result.uploadResult?.projectUrl
  const framesCount = result.framesExported || result.uploadResult?.framesImported || 0

  useEffect(() => {
    if (!autoRedirect || !projectUrl) return

    console.log(`🚀 Starting auto-redirect countdown to: ${projectUrl}`)

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          console.log(`🌐 Auto-redirecting to FrameFuse: ${projectUrl}`)
          onOpenProject(projectUrl)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [autoRedirect, projectUrl, onOpenProject])

  const handleCopyLink = async () => {
    if (projectUrl) {
      try {
        console.log('📋 Attempting to copy link:', projectUrl)

        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(projectUrl)
          console.log('✅ Link copied successfully with clipboard API')
        } else {
          // Fallback for older browsers or restricted contexts
          const textArea = document.createElement('textarea')
          textArea.value = projectUrl
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()

          const successful = document.execCommand('copy')
          document.body.removeChild(textArea)

          if (successful) {
            console.log('✅ Link copied successfully with fallback method')
          } else {
            throw new Error('Fallback copy method failed')
          }
        }

        // TODO: Add visual feedback (toast notification)
      } catch (err) {
        console.error('❌ Failed to copy link:', err)
        console.error('URL was:', projectUrl)
        // TODO: Show error message to user
      }
    } else {
      console.error('❌ No project URL available to copy')
    }
  }

  const handleCancelAutoRedirect = () => {
    setAutoRedirect(false)
    setCountdown(0)
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      {/* Icono de éxito */}
      <div style={{
        width: '64px',
        height: '64px',
        backgroundColor: '#10b981',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        fontSize: '32px'
      }}>
        ✅
      </div>

      {/* Mensaje principal */}
      <Text style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
        Export Successful!
      </Text>
      
      <Text style={{ fontSize: '12px', color: '#6b7280', marginBottom: '20px' }}>
        {framesCount} frame{framesCount !== 1 ? 's' : ''} exported to FrameFuse
      </Text>

      {/* Información del proyecto */}
      {projectUrl && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <Text style={{ fontSize: '12px', color: '#166534', marginBottom: '8px' }}>
            🎬 Your slideshow is ready!
          </Text>
          
          {/* Auto-redirect countdown */}
          {autoRedirect && countdown > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <Text style={{ fontSize: '11px', color: '#166534' }}>
                Opening in FrameFuse in {countdown} second{countdown !== 1 ? 's' : ''}...
              </Text>
              <Button
                secondary
                onClick={handleCancelAutoRedirect}
                style={{ 
                  fontSize: '10px', 
                  padding: '2px 6px', 
                  marginTop: '4px',
                  minHeight: '20px'
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Botones de acción */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {projectUrl && (
          <Button
            fullWidth
            onClick={() => onOpenProject(projectUrl)}
            style={{
              backgroundColor: '#111827',
              borderColor: '#111827',
               minHeight: '36px'
             }}
           >
            🎬 Open in FrameFuse
           </Button>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          {projectUrl && (
            <Button
              secondary
              fullWidth
              onClick={handleCopyLink}
              style={{ fontSize: '11px', minHeight: '28px' }}
            >
              📋 Copy Link
            </Button>
          )}
          
          <Button
            secondary
            fullWidth
            onClick={onStartNew}
            style={{ fontSize: '11px', minHeight: '28px' }}
          >
            🔄 Export More
          </Button>
        </div>
      </div>

      {/* Información adicional */}
      {result.failedFrames && result.failedFrames.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '12px',
          marginTop: '16px'
        }}>
          <Text style={{ fontSize: '11px', color: '#dc2626', marginBottom: '4px' }}>
            ⚠️ Some frames failed to export:
          </Text>
          <Text style={{ fontSize: '10px', color: '#dc2626' }}>
            {result.failedFrames.join(', ')}
          </Text>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
        <Text style={{ fontSize: '10px', color: '#9ca3af' }}>
          You can now create slideshows, add transitions, and export videos in FrameFuse
        </Text>
      </div>
    </div>
  )
}
