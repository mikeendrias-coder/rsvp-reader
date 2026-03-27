import React from 'react';

const THEMES = [
  { id: 'light', label: 'Light', bg: '#faf8f5', fg: '#2a2a2a' },
  { id: 'dark', label: 'Dark', bg: '#1a1a1a', fg: '#e0ddd8' },
  { id: 'sepia', label: 'Sepia', bg: '#f4ecd8', fg: '#3e3226' },
];

const FONTS = [
  { id: 'Literata', label: 'Literata', style: 'serif' },
  { id: 'Georgia', label: 'Georgia', style: 'serif' },
  { id: 'DM Sans', label: 'DM Sans', style: 'sans-serif' },
  { id: 'IBM Plex Mono', label: 'Plex Mono', style: 'monospace' },
];

export default function SettingsPanel({
  open,
  onClose,
  theme,
  setTheme,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
}) {
  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 100,
        }}
      />
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 280,
        background: 'var(--bg-primary)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        zIndex: 101,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-secondary)',
          }}>
            Settings
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: 'var(--text-muted)',
              padding: '4px 8px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Theme */}
          <div>
            <label style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              marginBottom: 8,
              display: 'block',
            }}>
              Theme
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{
                    width: 60,
                    height: 40,
                    borderRadius: 'var(--radius-sm)',
                    border: theme === t.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: t.bg,
                    color: t.fg,
                    fontSize: 10,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div>
            <label style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              marginBottom: 8,
              display: 'block',
            }}>
              Font Size: {fontSize}px
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setFontSize(s => Math.max(12, s - 1))}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  width: 32,
                  height: 32,
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                A
              </button>
              <input
                type="range"
                min={12}
                max={28}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <button
                onClick={() => setFontSize(s => Math.min(28, s + 1))}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  width: 32,
                  height: 32,
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                A
              </button>
            </div>
          </div>

          {/* Font family */}
          <div>
            <label style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              marginBottom: 8,
              display: 'block',
            }}>
              Font
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {FONTS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFontFamily(f.id)}
                  style={{
                    background: fontFamily === f.id ? 'var(--accent-soft)' : 'transparent',
                    border: fontFamily === f.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontFamily: `'${f.id}', ${f.style}`,
                    fontSize: 14,
                    color: fontFamily === f.id ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
