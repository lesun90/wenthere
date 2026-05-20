interface Props {
  detailLevel: 'country' | 'subdivision'
  onToggle: (level: 'country' | 'subdivision') => void
}

const pill: React.CSSProperties = {
  position: 'fixed',
  top: '1rem',
  right: '1rem',
  zIndex: 10,
  display: 'flex',
  background: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  borderRadius: '9999px',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  padding: '2px',
  gap: '2px',
}

function btn(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: '9999px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    background: active ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
    color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
    transition: 'background 0.15s, color 0.15s',
    fontFamily: 'inherit',
  }
}

export function DetailToggle({ detailLevel, onToggle }: Props) {
  return (
    <div style={pill}>
      <button style={btn(detailLevel === 'country')} onClick={() => onToggle('country')}>
        Countries
      </button>
      <button style={btn(detailLevel === 'subdivision')} onClick={() => onToggle('subdivision')}>
        Subdivisions
      </button>
    </div>
  )
}
