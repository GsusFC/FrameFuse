import { h } from 'preact'
import { Text, Button, VerticalSpace } from '@create-figma-plugin/ui'

interface HeaderProps {
  user?: {
    name: string
    email: string
    plan: string
  }
  onLogout: () => void
  onOpenSettings: () => void
}

export function Header({ user, onLogout, onOpenSettings }: HeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid #e5e5e5',
      backgroundColor: '#ffffff'
    }}>
      {/* Logo y título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          backgroundColor: '#111827',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          F
        </div>
        <Text style={{ fontWeight: '600', fontSize: '14px' }}>
          FrameFuse
        </Text>
      </div>

      {/* Controles del header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {user && (
          <Text style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
            {user.name}
          </Text>
        )}

        <Button
          secondary
          onClick={onOpenSettings}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            minHeight: '24px'
          }}
        >
          ⚙️ Settings
        </Button>

        <Button
          secondary
          onClick={onLogout}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            minHeight: '24px'
          }}
        >
          Logout
        </Button>
      </div>
    </div>
  )
}
