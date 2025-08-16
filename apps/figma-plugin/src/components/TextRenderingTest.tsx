import { h } from 'preact'
import { Text } from '@create-figma-plugin/ui'

// Componente de prueba para verificar renderizado de texto
export function TextRenderingTest() {
  const testFrameNames = [
    "Homepage Design", // Con descenders
    "Product Page Layout", // Texto largo
    "Contact Form", // Texto normal
    "Navigation Menu", // Con descenders
    "Footer Component", // Con descenders
    "Typography Guidelines", // Muy largo con descenders
    "HEADER SECTION", // Solo mayúsculas
    "login-page-v2", // Con guiones
    "User Profile & Settings", // Con símbolos
    "Shopping Cart (Empty State)" // Muy largo con paréntesis
  ]

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb' }}>
      <Text style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
        Text Rendering Test - Frame Names
      </Text>
      
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '6px'
      }}>
        {testFrameNames.map((name, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: index < testFrameNames.length - 1 ? '1px solid #f3f4f6' : 'none',
              backgroundColor: index % 2 === 0 ? '#fef7ff' : 'transparent',
              borderLeft: index % 2 === 0 ? '3px solid #ec4899' : '3px solid transparent',
              minHeight: '52px'
            }}
          >
            {/* Checkbox simulado */}
            <div style={{ 
              width: '16px', 
              height: '16px', 
              border: '2px solid #d1d5db',
              borderRadius: '3px',
              marginRight: '12px',
              backgroundColor: index % 2 === 0 ? '#ec4899' : 'transparent'
            }} />

            {/* Texto de prueba */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text style={{
                fontSize: '14px',
                fontWeight: '500',
                color: index % 2 === 0 ? '#ec4899' : '#111827',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: '1.5',
                display: 'block',
                verticalAlign: 'baseline'
              }}>
                {name}
              </Text>
            </div>

            {/* Indicador de longitud */}
            <div style={{ 
              fontSize: '10px', 
              color: '#9ca3af',
              marginLeft: '8px',
              flexShrink: 0
            }}>
              {name.length}ch
            </div>
          </div>
        ))}
      </div>

      {/* Información de métricas */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '6px'
      }}>
        <Text style={{ fontSize: '11px', color: '#1e40af', lineHeight: '1.4' }}>
          <strong>Métricas de renderizado:</strong><br />
          • Font size: 14px<br />
          • Line height: 1.5 (21px)<br />
          • Padding vertical: 14px × 2 = 28px<br />
          • Min height: 52px<br />
          • Espacio disponible: 52px - 28px = 24px<br />
          • Espacio necesario: 21px<br />
          • Margen de seguridad: 3px ✅
        </Text>
      </div>
    </div>
  )
}
