import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { Checkbox } from '@create-figma-plugin/ui'

interface Frame {
  id: string
  name: string
  width: number
  height: number
  complexity: 'low' | 'medium' | 'high'
  estimatedSize: string
  isValidForExport: boolean
}

interface FrameGridProps {
  frames: Frame[]
  selectedFrames: string[]
  onFrameSelection: (frameId: string, checked: boolean) => void
  onSelectAll: () => void
  onClearAll: () => void
  figmaSelection?: string[]
}

interface ThumbnailCache {
  [frameId: string]: {
    data: string // base64
    timestamp: number
    dimensions: { width: number, height: number }
  }
}

export function FrameGrid({
  frames,
  selectedFrames,
  onFrameSelection,
  onSelectAll,
  onClearAll,
  figmaSelection = []
}: FrameGridProps) {
  const [thumbnailCache, setThumbnailCache] = useState<ThumbnailCache>({})
  const [loadingThumbnails, setLoadingThumbnails] = useState<Set<string>>(new Set())

  const validFrames = frames.filter(frame => frame.isValidForExport)
  const selectedCount = selectedFrames.length
  const totalCount = validFrames.length

  // Generate thumbnail for a frame
  const generateThumbnail = async (frameId: string) => {
    if (thumbnailCache[frameId] || loadingThumbnails.has(frameId)) {
      return // Already cached or loading
    }

    console.log(`🖼️ Requesting thumbnail for frame: ${frameId}`)

    setLoadingThumbnails(prev => {
      const newSet = new Set(prev)
      newSet.add(frameId)
      return newSet
    })

    try {
      // Use emit instead of postMessage for better compatibility
      const messageId = `thumbnail-${frameId}-${Date.now()}`

      // Set up response listener
      const handleResponse = (data: any) => {
        if (data.messageId === messageId) {
          console.log(`📸 Thumbnail response received for ${frameId}:`, data)

          if (data.success && data.thumbnail) {
            setThumbnailCache(prev => ({
              ...prev,
              [frameId]: {
                data: data.thumbnail,
                timestamp: Date.now(),
                dimensions: data.dimensions || { width: 190, height: 120 }
              }
            }))
            console.log(`✅ Thumbnail cached for ${frameId}`)
          } else {
            console.error(`❌ Thumbnail generation failed for ${frameId}:`, data.error)
          }

          setLoadingThumbnails(prev => {
            const newSet = new Set(prev)
            newSet.delete(frameId)
            return newSet
          })
        }
      }

      // Listen for response
      window.addEventListener('message', (event) => {
        if (event.data.pluginMessage?.type === 'thumbnail-response') {
          handleResponse(event.data.pluginMessage)
        }
      })

      // Send request using emit
      parent.postMessage({
        pluginMessage: {
          type: 'generate-thumbnail',
          frameId,
          messageId
        }
      }, '*')

      // Timeout fallback
      setTimeout(() => {
        console.warn(`⏰ Thumbnail generation timeout for ${frameId}`)
        setLoadingThumbnails(prev => {
          const newSet = new Set(prev)
          newSet.delete(frameId)
          return newSet
        })
      }, 15000)

    } catch (error) {
      console.error('Failed to generate thumbnail:', error)
      setLoadingThumbnails(prev => {
        const newSet = new Set(prev)
        newSet.delete(frameId)
        return newSet
      })
    }
  }

  // Generate thumbnails for visible frames
  useEffect(() => {
    validFrames.forEach(frame => {
      generateThumbnail(frame.id)
    })
  }, [validFrames])

  if (validFrames.length === 0) {
    return (
      <div style={{
        padding: '60px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
          opacity: '0.4'
        }}>
          📋
        </div>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
          No frames selected
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          Select frames in Figma to get started
        </div>
      </div>
    )
  }

  return (
    <div style={{
      padding: '12px 16px',
      width: '100%',
      maxWidth: '500px',
      boxSizing: 'border-box'
    }}>
      {/* Control buttons - minimal */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        justifyContent: 'center'
      }}>
        <button
          onClick={onSelectAll}
          disabled={selectedCount === totalCount}
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            backgroundColor: selectedCount === totalCount ? '#f3f4f6' : '#ec4899',
            color: selectedCount === totalCount ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedCount === totalCount ? 'not-allowed' : 'pointer',
            fontWeight: '500'
          }}
        >
          Select All
        </button>
        <button
          onClick={onClearAll}
          disabled={selectedCount === 0}
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            backgroundColor: selectedCount === 0 ? '#f3f4f6' : '#6b7280',
            color: selectedCount === 0 ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
            fontWeight: '500'
          }}
        >
          Clear All
        </button>
      </div>

      {/* Grid of thumbnails */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        maxHeight: '400px',
        overflowY: 'auto',
        width: '100%',
        maxWidth: '452px',
        margin: '0 auto'
      }}>
        {validFrames.map((frame) => {
          const isSelected = selectedFrames.includes(frame.id)
          const isLoading = loadingThumbnails.has(frame.id)
          const thumbnail = thumbnailCache[frame.id]

          return (
            <FrameGridItem
              key={frame.id}
              frame={frame}
              isSelected={isSelected}
              isLoading={isLoading}
              thumbnail={thumbnail?.data}
              onSelect={onFrameSelection}
            />
          )
        })}
      </div>
    </div>
  )
}

// Individual grid item component
interface FrameGridItemProps {
  frame: Frame
  isSelected: boolean
  isLoading: boolean
  thumbnail?: string
  onSelect: (frameId: string, checked: boolean) => void
}

function FrameGridItem({ frame, isSelected, isLoading, thumbnail, onSelect }: FrameGridItemProps) {
  const aspectRatio = frame.width / frame.height
  const maxWidth = 190  // Reduced from 210px to fit better
  const maxHeight = 120 // Reduced from 140px to fit better

  let thumbnailWidth = maxWidth
  let thumbnailHeight = maxWidth / aspectRatio

  if (thumbnailHeight > maxHeight) {
    thumbnailHeight = maxHeight
    thumbnailWidth = maxHeight * aspectRatio
  }

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: isSelected ? '#fef7ff' : '#ffffff',
        border: isSelected ? '2px solid #ec4899' : '2px solid #e5e7eb',
        borderRadius: '8px',
        padding: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? '0 4px 12px rgba(236, 72, 153, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '220px'
      }}
      onClick={() => onSelect(frame.id, !isSelected)}
    >
      {/* Checkbox overlay */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '4px',
        padding: '2px'
      }}>
        <Checkbox
          value={isSelected}
          onValueChange={(checked) => onSelect(frame.id, checked)}
        >
          <span></span>
        </Checkbox>
      </div>

      {/* Thumbnail area */}
      <div style={{
        width: '100%',
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        {isLoading ? (
          // Loading skeleton
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%'
          }} />
        ) : thumbnail ? (
          // Real thumbnail
          <img
            src={`data:image/png;base64,${thumbnail}`}
            alt=""
            style={{
              width: `${thumbnailWidth}px`,
              height: `${thumbnailHeight}px`,
              objectFit: 'cover',
              borderRadius: '2px'
            }}
          />
        ) : (
          // Fallback placeholder
          <div style={{
            width: `${thumbnailWidth}px`,
            height: `${thumbnailHeight}px`,
            backgroundColor: '#e5e7eb',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              backgroundColor: '#9ca3af',
              borderRadius: '2px'
            }} />
          </div>
        )}
      </div>
    </div>
  )
}
