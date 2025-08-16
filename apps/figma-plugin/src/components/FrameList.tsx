import { h } from 'preact'
import { Text, Button, Checkbox, VerticalSpace } from '@create-figma-plugin/ui'

interface Frame {
  id: string
  name: string
  width: number
  height: number
  complexity: 'low' | 'medium' | 'high'
  estimatedSize: string
  isValidForExport: boolean
}

interface FrameListProps {
  frames: Frame[]
  selectedFrames: string[]
  onFrameSelection: (frameId: string, checked: boolean) => void
  onSelectAll: () => void
  onClearAll: () => void
  figmaSelection?: string[] // Frames seleccionados en Figma
}

export function FrameList({ 
  frames, 
  selectedFrames, 
  onFrameSelection, 
  onSelectAll, 
  onClearAll,
  figmaSelection = []
}: FrameListProps) {
  const validFrames = frames.filter(frame => frame.isValidForExport)
  const selectedCount = selectedFrames.length
  const totalCount = validFrames.length



  return (
    <div style={{ padding: '16px' }}>
      {/* Header con información */}
      <div style={{ marginBottom: '16px' }}>
        {totalCount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Text style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Frames ({totalCount})
            </Text>
            <Text style={{
              fontSize: '12px',
              color: selectedCount > 0 ? '#ec4899' : '#6b7280',
              fontWeight: selectedCount > 0 ? '600' : '400'
            }}>
              {selectedCount} selected
            </Text>
          </div>
        )}

        {/* Mostrar si hay selección de Figma */}
        {figmaSelection.length > 0 && totalCount > 0 && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '4px',
            padding: '8px 12px',
            marginBottom: '12px'
          }}>
            <Text style={{ fontSize: '11px', color: '#166534' }}>
              ✅ {figmaSelection.length} frames imported from your Figma selection
            </Text>
          </div>
        )}

        {/* Controles de selección */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            secondary
            onClick={onSelectAll}
            disabled={selectedCount === totalCount}
            style={{ fontSize: '11px', padding: '4px 8px', minHeight: '24px' }}
          >
            Select All
          </Button>
          <Button
            secondary
            onClick={onClearAll}
            disabled={selectedCount === 0}
            style={{ fontSize: '11px', padding: '4px 8px', minHeight: '24px' }}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Lista de frames */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        backgroundColor: '#ffffff'
      }}>
        {validFrames.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: '0.6' }}>📋</div>
            <Text style={{ color: '#374151', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              No frames selected
            </Text>
            <Text style={{ color: '#6b7280', fontSize: '12px', lineHeight: '1.5' }}>
              Please select frames in Figma first, then return to this plugin to export them.
            </Text>
          </div>
        ) : (
          validFrames.map((frame, index) => {
            const isSelected = selectedFrames.includes(frame.id)

            return (
              <div
                key={frame.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderBottom: index < validFrames.length - 1 ? '1px solid #f3f4f6' : 'none',
                  backgroundColor: isSelected ? '#fef7ff' : 'transparent',
                  borderLeft: isSelected ? '3px solid #ec4899' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  minHeight: '52px'
                }}
                onClick={() => onFrameSelection(frame.id, !isSelected)}
              >
                {/* Checkbox */}
                <div style={{ marginRight: '12px' }}>
                  <Checkbox
                    value={isSelected}
                    onValueChange={(checked) => onFrameSelection(frame.id, checked)}
                  >
                    <span></span>
                  </Checkbox>
                </div>

                {/* Frame info - clean and readable */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: isSelected ? '#ec4899' : '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.5',
                    display: 'block',
                    verticalAlign: 'baseline'
                  }}>
                    {frame.name}
                  </Text>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer con información */}
      {selectedCount > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '4px'
        }}>
          <Text style={{ fontSize: '11px', color: '#166534' }}>
            ✅ Ready to export {selectedCount} frame{selectedCount !== 1 ? 's' : ''}
          </Text>
        </div>
      )}
    </div>
  )
}
