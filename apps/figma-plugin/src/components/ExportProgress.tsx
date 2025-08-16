import { h } from 'preact'
import { Text, LoadingIndicator, VerticalSpace } from '@create-figma-plugin/ui'

interface ExportProgressProps {
  stage: string
  current: number
  total: number
  message: string
  percentage: number
}

export function ExportProgress({ stage, current, total, message, percentage }: ExportProgressProps) {
  const getStageIcon = (stageName: string) => {
    switch (stageName) {
      case 'preparing': return '⚙️'
      case 'exporting': return '📸'
      case 'uploading': return '☁️'
      case 'creating': return '🎬'
      case 'complete': return '✅'
      default: return '⏳'
    }
  }

  const getStageColor = (stageName: string) => {
    switch (stageName) {
      case 'preparing': return '#f59e0b'
      case 'exporting': return '#3b82f6'
      case 'uploading': return '#8b5cf6'
      case 'creating': return '#ec4899'
      case 'complete': return '#10b981'
      default: return '#6b7280'
    }
  }

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      margin: '16px'
    }}>
      {/* Header con icono y etapa */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        marginBottom: '16px' 
      }}>
        <span style={{ fontSize: '20px' }}>
          {getStageIcon(stage)}
        </span>
        <Text style={{ 
          fontSize: '14px', 
          fontWeight: '600',
          color: getStageColor(stage)
        }}>
          {stage.charAt(0).toUpperCase() + stage.slice(1)}...
        </Text>
      </div>

      {/* Barra de progreso */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${getStageColor(stage)}, ${getStageColor(stage)}dd)`,
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        {/* Porcentaje */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: '4px'
        }}>
          <Text style={{ fontSize: '11px', color: '#6b7280' }}>
            {current} of {total}
          </Text>
          <Text style={{ 
            fontSize: '12px', 
            fontWeight: '600',
            color: getStageColor(stage)
          }}>
            {Math.round(percentage)}%
          </Text>
        </div>
      </div>

      {/* Mensaje actual */}
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        padding: '8px 12px',
        marginBottom: '12px'
      }}>
        <Text style={{ fontSize: '11px', color: '#374151' }}>
          {message}
        </Text>
      </div>

      {/* Indicador de carga */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '8px'
      }}>
        <LoadingIndicator />
        <Text style={{ fontSize: '11px', color: '#6b7280' }}>
          Please keep this window open...
        </Text>
      </div>

      {/* Tiempo estimado (opcional) */}
      {total > 1 && current > 0 && (
        <div style={{ 
          marginTop: '12px',
          textAlign: 'center'
        }}>
          <Text style={{ fontSize: '10px', color: '#9ca3af' }}>
            Estimated time remaining: {Math.ceil((total - current) * 2)} seconds
          </Text>
        </div>
      )}
    </div>
  )
}
