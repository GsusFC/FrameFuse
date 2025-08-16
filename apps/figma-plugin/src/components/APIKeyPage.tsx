import { h } from 'preact'
import { useState } from 'preact/hooks'
import { Container, Text, Button, Textbox, VerticalSpace, LoadingIndicator } from '@create-figma-plugin/ui'

interface APIKeyPageProps {
  apiKey: string
  onApiKeyChange: (value: string) => void
  onAuthenticate: () => void
  error?: string
  isLoading?: boolean
}

export function APIKeyPage({ 
  apiKey, 
  onApiKeyChange, 
  onAuthenticate, 
  error, 
  isLoading 
}: APIKeyPageProps) {
  const [focused, setFocused] = useState(false)
  
  const isValidFormat = apiKey.startsWith('ff_figma_') && apiKey.length > 15
  const canSubmit = isValidFormat && !isLoading

  return (
    <Container space="medium">
      <VerticalSpace space="medium" />
      
      {/* Header con logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          backgroundColor: '#111827',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          margin: '0 auto 16px'
        }}>
          F
        </div>
        <Text style={{ fontSize: '18px', fontWeight: '600' }}>
          FrameFuse
        </Text>
      </div>

      {/* Card de autenticación */}
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '16px'
      }}>

        {/* Input de API key */}
        <div style={{ marginBottom: '12px' }}>
          <Textbox
            placeholder="ff_figma_..."
            value={apiKey}
            onValueInput={onApiKeyChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            password
            style={{
              borderColor: error ? '#ef4444' : focused ? '#111827' : '#d1d5db',
              borderWidth: '2px'
            }}
          />
          

        </div>

        {/* Error message */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            padding: '8px 12px',
            marginBottom: '12px'
          }}>
            <Text style={{ fontSize: '12px', color: '#dc2626' }}>
              ❌ {error}
            </Text>
          </div>
        )}

        {/* Botón de autenticación */}
        <Button
          fullWidth
          onClick={onAuthenticate}
          disabled={!canSubmit}
          style={{
            backgroundColor: canSubmit ? '#ec4899' : '#d1d5db',
            borderColor: canSubmit ? '#ec4899' : '#d1d5db',
            minHeight: '36px'
          }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LoadingIndicator />
              <span>Connecting...</span>
            </div>
          ) : (
            'Connect'
          )}
        </Button>
      </div>

      {/* Help text */}
      <div style={{
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '6px',
        padding: '12px'
      }}>
        <Text style={{ fontSize: '11px', color: '#1e40af' }}>
          Get your API key from FrameFuse Settings
        </Text>
      </div>

      {/* Development key for testing */}
      <div style={{
        backgroundColor: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '6px',
        padding: '12px',
        marginTop: '8px'
      }}>
        <Text style={{ fontSize: '11px', color: '#92400e' }}>
          <strong>For testing:</strong> ff_figma_dev_local_testing_key
        </Text>
      </div>

      <VerticalSpace space="medium" />
    </Container>
  )
}
