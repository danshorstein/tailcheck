// TailCheck — future camera/OCR placeholder
// Loaded as <script type="text/babel">

// ─────────────────────────────────────────────────────────────
// CameraScreen — no fake scan; shows a future-feature notice instead
// ─────────────────────────────────────────────────────────────
function CameraScreen({ onClose }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: C.bg,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center',
      padding: 22,
    }}>
      {/* Subtle background glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background:
          'radial-gradient(ellipse at 50% 18%, rgba(107,160,255,0.10), transparent 48%), radial-gradient(ellipse at 50% 92%, rgba(217,174,94,0.06), transparent 58%)',
        pointerEvents: 'none',
      }} />

      {/* Top close button */}
      <div style={{
        position: 'absolute', top: 14, left: 16, right: 16, zIndex: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 99,
          background: C.surface,
          border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <Icon name="close" size={16} color={C.textMute} />
        </button>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: C.textMute,
          textTransform: 'uppercase', letterSpacing: 1.4,
          padding: '6px 10px', borderRadius: 6,
          background: C.surface,
          border: `1px solid ${C.border}`,
        }}>
          Future feature
        </div>
      </div>

      {/* Center card */}
      <div style={{
        position: 'relative', zIndex: 2,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: '24px 20px',
        boxShadow: '0 20px 45px rgba(0,0,0,0.35)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          margin: '0 auto 16px',
          background: C.bgDeep,
          border: `1px solid ${C.borderStrong}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="camera" size={28} color={C.info} />
        </div>

        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 22,
          fontWeight: 650,
          letterSpacing: -0.5,
          color: C.text,
          marginBottom: 8,
        }}>
          Camera scan is coming soon
        </div>

        <p style={{
          margin: '0 auto 18px',
          maxWidth: 310,
          fontFamily: 'var(--font-sans)',
          fontSize: 13.5,
          lineHeight: 1.55,
          color: C.textMute,
          textWrap: 'pretty',
        }}>
          TailCheck will eventually let you take a photo of an aircraft tail number and use OCR to start a lookup. For now, enter the tail number manually from the search screen.
        </p>

        <div style={{
          background: C.bgDeep,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 12,
          display: 'flex',
          gap: 9,
          alignItems: 'flex-start',
          textAlign: 'left',
          marginBottom: 18,
        }}>
          <Icon name="info" size={14} color={C.textMute} />
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            lineHeight: 1.5,
            color: C.textMute,
          }}>
            We removed the simulated camera flow so the prototype does not imply that real image capture or OCR is active yet.
          </span>
        </div>

        <button onClick={onClose} style={{
          width: '100%',
          padding: '13px 14px',
          borderRadius: 12,
          background: C.text,
          color: C.bg,
          border: `1px solid ${C.text}`,
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          WebkitAppearance: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          Enter tail number manually
          <Icon name="forward" size={13} color={C.bg} />
        </button>
      </div>
    </div>
  );
}
window.CameraScreen = CameraScreen;