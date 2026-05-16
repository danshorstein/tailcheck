// TailCheck — Camera capture + OCR confirm screens
// Loaded as <script type="text/babel">

const { useState: useStateCam, useEffect: useEffectCam, useRef: useRefCam } = React;

// ─────────────────────────────────────────────────────────────
// CameraScreen — fake viewfinder with simulated tail-number detection
// ─────────────────────────────────────────────────────────────
function CameraScreen({ onClose, onDetected }) {
  const [phase, setPhase] = useStateCam('scanning'); // scanning | locked
  const [detected, setDetected] = useStateCam(null);

  // Cycle through the demo pack so the OCR moment lands on something useful
  const candidates = window.DEMO_PACK.aircraft.map((a) => a.n_number);
  const pickRef = useRefCam(0);

  useEffectCam(() => {
    const t = setTimeout(() => {
      const pick = candidates[pickRef.current % candidates.length];
      pickRef.current += 1;
      setDetected(pick);
      setPhase('locked');
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  const rescan = () => {
    setDetected(null);
    setPhase('scanning');
    setTimeout(() => {
      const pick = candidates[pickRef.current % candidates.length];
      pickRef.current += 1;
      setDetected(pick);
      setPhase('locked');
    }, 1500);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#000', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Faux camera feed — gradient + grain */}
      <div style={{
        position: 'absolute', inset: 0,
        background:
          'radial-gradient(ellipse at 30% 20%, #2a3340 0%, #0c1218 55%, #04070b 100%)',
        opacity: 0.95,
      }} />

      {/* Stylized aircraft silhouette on a faux ramp */}
      <FakeAircraftScene tail={phase === 'locked' ? detected : null} scanning={phase === 'scanning'} />

      {/* Top bar */}
      <div style={{
        position: 'relative', zIndex: 10,
        padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 99,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <Icon name="close" size={16} color="#fff" />
        </button>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.7)',
          textTransform: 'uppercase', letterSpacing: 1.4,
          padding: '6px 10px', borderRadius: 6,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          Scan tail number
        </div>
        <button style={{
          width: 36, height: 36, borderRadius: 99,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <Icon name="flash" size={16} color="#fff" />
        </button>
      </div>

      {/* Reticle / scan frame */}
      <div style={{
        position: 'absolute', top: '32%', left: '50%', transform: 'translate(-50%, 0)',
        width: 280, height: 90, pointerEvents: 'none', zIndex: 5,
      }}>
        <ReticleCorners color={phase === 'locked' ? C.green : 'rgba(255,255,255,0.85)'} />
        {phase === 'scanning' && (
          <div style={{
            position: 'absolute', left: 8, right: 8, top: 0,
            height: 2, background: 'linear-gradient(90deg, transparent, #6BA0FF, transparent)',
            animation: 'tcScan 1.4s ease-in-out infinite',
            boxShadow: '0 0 12px #6BA0FF',
          }} />
        )}
        {phase === 'locked' && detected && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 600,
            color: C.green, letterSpacing: 2.5,
            textShadow: '0 0 16px rgba(111,190,147,0.6)',
          }}>{detected}</div>
        )}
      </div>

      {/* Hint text */}
      <div style={{
        position: 'absolute', top: '32%', left: 0, right: 0, marginTop: 110,
        textAlign: 'center', zIndex: 5,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '7px 12px', borderRadius: 99,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.12)',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: phase === 'locked' ? C.green : 'rgba(255,255,255,0.85)',
          letterSpacing: 0.6, textTransform: 'uppercase',
        }}>
          {phase === 'locked' ? (
            <><Icon name="check" size={12} color={C.green} /> Tail number detected</>
          ) : (
            <>Hold steady · scanning</>
          )}
        </div>
      </div>

      {/* Bottom action sheet */}
      <div style={{
        position: 'absolute', bottom: 34, left: 0, right: 0, zIndex: 10,
        padding: '0 16px',
      }}>
        {phase === 'locked' && detected ? (
          <div style={{
            background: 'rgba(11,14,18,0.92)',
            backdropFilter: 'blur(14px)',
            border: `1px solid ${C.border}`,
            borderRadius: 14, padding: 16,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10.5, color: C.textDim,
              letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
            }}>OCR result</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600,
                color: C.text, letterSpacing: 1,
              }}>{detected}</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: C.green,
                letterSpacing: 0.6, textTransform: 'uppercase',
              }}>0.94 conf.</div>
            </div>
            <p style={{
              margin: '10px 0 14px', fontFamily: 'var(--font-sans)', fontSize: 12.5,
              color: C.textMute, lineHeight: 1.5,
            }}>
              Confirm the detected tail number before we look up its public records.
              You can edit before continuing.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={rescan} style={{
                flex: 1, padding: '12px', borderRadius: 10,
                background: 'transparent', color: C.text,
                border: `1px solid ${C.borderStrong}`,
                fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500,
                cursor: 'pointer', WebkitAppearance: 'none',
              }}>Rescan</button>
              <button onClick={() => onDetected(detected)} style={{
                flex: 2, padding: '12px', borderRadius: 10,
                background: C.text, color: C.bg,
                border: `1px solid ${C.text}`,
                fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500,
                cursor: 'pointer', WebkitAppearance: 'none',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                Confirm &amp; look up
                <Icon name="forward" size={13} color={C.bg} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex', justifyContent: 'center',
          }}>
            <div style={{
              width: 70, height: 70, borderRadius: 99,
              border: '3px solid rgba(255,255,255,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 99, background: '#fff',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes tcScan {
          0%   { transform: translateY(8px); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(80px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
window.CameraScreen = CameraScreen;

// Stylized faux aircraft "scene" so the viewfinder isn't empty
function FakeAircraftScene({ tail, scanning }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
    }}>
      {/* horizon */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: '35%',
        height: 1, background: 'rgba(255,255,255,0.06)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '35%',
        background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.4))',
      }} />

      {/* aircraft silhouette */}
      <svg
        viewBox="0 0 400 240"
        style={{
          position: 'absolute', left: '50%', top: '38%',
          transform: 'translateX(-50%)',
          width: 360, height: 'auto',
          opacity: 0.55,
        }}
      >
        {/* fuselage */}
        <ellipse cx="200" cy="140" rx="180" ry="22" fill="#0d141c" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        {/* tail */}
        <path d="M340 140 L380 90 L390 90 L385 140 Z" fill="#0d141c" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        {/* wings */}
        <path d="M120 140 L80 170 L250 168 L260 140 Z" fill="#080c11" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        {/* windows row */}
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={i} x={70 + i * 22} y="134" width="10" height="6" rx="1" fill="rgba(255,255,255,0.12)" />
        ))}
        {/* tail number on tail */}
        <text x="365" y="118" textAnchor="middle" fill={scanning ? "rgba(255,255,255,0.35)" : "rgba(111,190,147,0.85)"}
          fontFamily="JetBrains Mono, monospace" fontSize="8" fontWeight="600" letterSpacing="0.8">
          {tail || 'N••••'}
        </text>
      </svg>

      {/* ground texture lines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute', left: '20%', right: '20%',
          bottom: `${4 + i * 3}%`, height: 1,
          background: 'rgba(255,255,255,0.03)',
        }} />
      ))}
    </div>
  );
}

// Corner brackets for the reticle
function ReticleCorners({ color }) {
  const L = 18, W = 2.5;
  const corner = (top, left, rotate) => (
    <div style={{
      position: 'absolute', top, left, width: L, height: L,
      transform: rotate, transition: 'border-color 0.2s',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: L, height: W, background: color, borderRadius: 2 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: L, background: color, borderRadius: 2 }} />
    </div>
  );
  return (
    <>
      {corner(0, 0, 'rotate(0deg)')}
      <div style={{ position: 'absolute', top: 0, right: 0, width: L, height: L, transform: 'scaleX(-1)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: L, height: W, background: color, borderRadius: 2 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: L, background: color, borderRadius: 2 }} />
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: L, height: L, transform: 'scaleY(-1)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: L, height: W, background: color, borderRadius: 2 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: L, background: color, borderRadius: 2 }} />
      </div>
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: L, height: L, transform: 'scale(-1)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: L, height: W, background: color, borderRadius: 2 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: L, background: color, borderRadius: 2 }} />
      </div>
    </>
  );
}
