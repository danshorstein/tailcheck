// TailCheck — shared UI primitives + small helpers
// Loaded as <script type="text/babel"> — exposes components on window.

const C = {
  bg:           "#0B0E12",
  bgDeep:       "#070A0E",
  surface:      "#131820",
  surfaceElev:  "#1A2029",
  surface3:     "#222A35",
  border:       "#242C37",
  borderStrong: "#2F3845",
  text:         "#E7EBF1",
  textMute:     "#8693A4",
  textDim:      "#5F6B7A",
  info:         "#6BA0FF",
  infoSoft:     "rgba(107,160,255,0.14)",
  amber:        "#D9AE5E",
  amberSoft:    "rgba(217,174,94,0.14)",
  red:          "#D87265",
  redSoft:      "rgba(216,114,101,0.14)",
  green:        "#6FBE93",
  greenSoft:    "rgba(111,190,147,0.14)",
  neutral:      "#8693A4",
  neutralSoft:  "rgba(134,147,164,0.14)",
};
window.C = C;

// ─── Signal → color mapping ─────────────────────────────────────────────
const SIGNAL_STYLES = {
  "No major public records found": { color: C.green,   soft: C.greenSoft,   dot: C.green   },
  "Some public records found":     { color: C.info,    soft: C.infoSoft,    dot: C.info    },
  "Elevated public-records signal":{ color: C.amber,   soft: C.amberSoft,   dot: C.amber   },
  "Incomplete / ambiguous data":   { color: C.neutral, soft: C.neutralSoft, dot: C.neutral },
};
window.SIGNAL_STYLES = SIGNAL_STYLES;

const CONFIDENCE_DOTS = { High: 3, Medium: 2, Low: 1 };
window.CONFIDENCE_DOTS = CONFIDENCE_DOTS;

// ─── Brand mark — stylized vertical stabilizer ──────────────────────────
function TailMark({ size = 18, color = C.text }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
      {/* tail fin wedge */}
      <path d="M5 19 L14 5 L18 5 L18 19 Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <path d="M18 14 L21 19 L18 19 Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <circle cx="15.5" cy="11" r="1" fill={color} />
    </svg>
  );
}
window.TailMark = TailMark;

// ─── Brand wordmark ─────────────────────────────────────────────────────
function Wordmark({ size = 16, color = C.text, dim = C.textMute }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <TailMark size={size + 4} color={color} />
      <span style={{
        fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: size, letterSpacing: -0.2, color,
      }}>
        Tail<span style={{ color: dim, fontWeight: 500 }}>Check</span>
      </span>
    </div>
  );
}
window.Wordmark = Wordmark;

// ─── Generic Card ───────────────────────────────────────────────────────
function Card({ children, style = {}, onClick, padding = 16, interactive = false }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding,
        cursor: interactive || onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, transform 0.15s',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
window.Card = Card;

// ─── SectionLabel — small ALL-CAPS section header ───────────────────────
function SectionLabel({ children, count, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '0 4px', marginBottom: 8,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 1.2,
        color: C.textDim, textTransform: 'uppercase', fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>
        {children}
        {count != null && (
          <span style={{ marginLeft: 6, color: C.textMute }}>· {count}</span>
        )}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
window.SectionLabel = SectionLabel;

// ─── SignalLabel — colored chip for the four signal labels ──────────────
function SignalLabel({ label, size = 'md' }) {
  const s = SIGNAL_STYLES[label] || SIGNAL_STYLES["Incomplete / ambiguous data"];
  const px = size === 'sm' ? '4px 8px' : '6px 10px';
  const fs = size === 'sm' ? 10.5 : 11.5;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: px, borderRadius: 6,
      background: s.soft, color: s.color,
      border: `1px solid ${s.color}33`,
      fontFamily: 'var(--font-mono)', fontSize: fs, fontWeight: 500,
      letterSpacing: 0.2, textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 99, background: s.dot,
        boxShadow: `0 0 6px ${s.dot}99`,
      }} />
      {label}
    </div>
  );
}
window.SignalLabel = SignalLabel;

// ─── ConfidenceMeter — 3 dots filled per level ──────────────────────────
function ConfidenceMeter({ level, label }) {
  const filled = CONFIDENCE_DOTS[level] || 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 2.5 }}>
        {[0,1,2].map((i) => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: 99,
            background: i < filled ? C.text : C.border,
          }} />
        ))}
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, color: C.text,
        textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500,
      }}>
        {level}{label && <span style={{ color: C.textDim, marginLeft: 4 }}>· {label}</span>}
      </span>
    </div>
  );
}
window.ConfidenceMeter = ConfidenceMeter;

// ─── SourceBadge — short label with provenance ─────────────────────────
function SourceBadge({ sourceKey, accessed }) {
  const meta = window.getSourceMeta(sourceKey);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 7px', borderRadius: 4,
      background: C.bgDeep, border: `1px solid ${C.border}`,
      fontFamily: 'var(--font-mono)', fontSize: 10, color: C.textMute,
      letterSpacing: 0.3, textTransform: 'uppercase',
    }}>
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <path d="M2 6 L5 9 L10 3" stroke={C.green} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {meta.short}
      {accessed && <span style={{ color: C.textDim }}>· {accessed.slice(0,10)}</span>}
    </div>
  );
}
window.SourceBadge = SourceBadge;

// ─── KeyValueRow — label + value, mono on the value ─────────────────────
function KV({ k, v, mono = true, last = false }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      gap: 12, padding: '9px 0',
      borderBottom: last ? 'none' : `1px solid ${C.border}`,
    }}>
      <span style={{
        color: C.textMute, fontFamily: 'var(--font-sans)', fontSize: 12.5,
        flexShrink: 0,
      }}>{k}</span>
      <span style={{
        color: C.text,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontSize: mono ? 12 : 13, fontWeight: mono ? 500 : 400,
        textAlign: 'right', letterSpacing: mono ? 0.1 : 0,
      }}>{v ?? '—'}</span>
    </div>
  );
}
window.KV = KV;

// ─── Hairline divider with optional label ───────────────────────────────
function Hairline({ label, style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {label && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: C.textDim,
          letterSpacing: 1.2, textTransform: 'uppercase',
        }}>{label}</span>
      )}
      {label && <div style={{ flex: 1, height: 1, background: C.border }} />}
    </div>
  );
}
window.Hairline = Hairline;

// ─── Generic icon ───────────────────────────────────────────────────────
function Icon({ name, size = 16, color = 'currentColor', stroke = 1.6 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', style: { display: 'block', flexShrink: 0 } };
  const s = { stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  switch (name) {
    case 'search':
      return <svg {...p}><circle cx="11" cy="11" r="6.5" {...s} /><path d="M16 16 L20 20" {...s} /></svg>;
    case 'camera':
      return <svg {...p}><path d="M4 8 H8 L10 5 H14 L16 8 H20 V18 H4 Z" {...s} /><circle cx="12" cy="13" r="3.5" {...s} /></svg>;
    case 'back':
      return <svg {...p}><path d="M15 19 L8 12 L15 5" {...s} /></svg>;
    case 'forward':
      return <svg {...p}><path d="M9 5 L16 12 L9 19" {...s} /></svg>;
    case 'close':
      return <svg {...p}><path d="M6 6 L18 18 M6 18 L18 6" {...s} /></svg>;
    case 'share':
      return <svg {...p}><circle cx="6" cy="12" r="2.5" {...s} /><circle cx="18" cy="6" r="2.5" {...s} /><circle cx="18" cy="18" r="2.5" {...s} /><path d="M8 11 L16 7 M8 13 L16 17" {...s} /></svg>;
    case 'info':
      return <svg {...p}><circle cx="12" cy="12" r="9" {...s} /><path d="M12 8 V8 M12 11 V16" {...s} /></svg>;
    case 'alert':
      return <svg {...p}><path d="M12 3 L21 19 H3 Z" {...s} /><path d="M12 10 V14" {...s} /><circle cx="12" cy="17" r="0.5" fill={color} stroke="none" /></svg>;
    case 'chevron-right':
      return <svg {...p}><path d="M9 5 L16 12 L9 19" {...s} /></svg>;
    case 'chevron-down':
      return <svg {...p}><path d="M5 9 L12 16 L19 9" {...s} /></svg>;
    case 'plus':
      return <svg {...p}><path d="M12 5 V19 M5 12 H19" {...s} /></svg>;
    case 'tag':
      return <svg {...p}><path d="M3 12 L12 3 H20 V11 L11 20 Z" {...s} /><circle cx="15.5" cy="8.5" r="1.2" fill={color} stroke="none" /></svg>;
    case 'history':
      return <svg {...p}><path d="M4 12 A8 8 0 1 0 6 6.5" {...s} /><path d="M3 4 V8 H7" {...s} /><path d="M12 8 V12 L15 14" {...s} /></svg>;
    case 'external':
      return <svg {...p}><path d="M14 4 H20 V10" {...s} /><path d="M20 4 L11 13" {...s} /><path d="M19 14 V19 H5 V5 H10" {...s} /></svg>;
    case 'check':
      return <svg {...p}><path d="M4 12 L10 18 L20 6" {...s} /></svg>;
    case 'dash':
      return <svg {...p}><path d="M6 12 H18" {...s} /></svg>;
    case 'flash':
      return <svg {...p}><path d="M13 3 L5 14 H11 L10 21 L19 10 H13 Z" {...s} /></svg>;
    case 'code':
      return <svg {...p}><path d="M8 7 L3 12 L8 17" {...s} /><path d="M16 7 L21 12 L16 17" {...s} /><path d="M14 5 L10 19" {...s} /></svg>;
    default:
      return null;
  }
}
window.Icon = Icon;

// ─── Pill button ───────────────────────────────────────────────────────
function PillButton({ children, onClick, variant = 'primary', icon, style = {} }) {
  const variants = {
    primary: { bg: C.text, fg: C.bg, border: C.text },
    ghost:   { bg: 'transparent', fg: C.text, border: C.borderStrong },
    subtle:  { bg: C.surfaceElev, fg: C.text, border: C.border },
  };
  const v = variants[variant];
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '11px 16px', borderRadius: 10,
      background: v.bg, color: v.fg, border: `1px solid ${v.border}`,
      fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
      cursor: 'pointer', transition: 'transform 0.1s, opacity 0.15s',
      WebkitAppearance: 'none', appearance: 'none',
      ...style,
    }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {icon && <Icon name={icon} size={14} color={v.fg} />}
      {children}
    </button>
  );
}
window.PillButton = PillButton;

// ─── Date helpers ──────────────────────────────────────────────────────
window.formatDate = function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
};
window.yearFrom = function yearFrom(iso) {
  if (!iso) return null;
  return parseInt(iso.slice(0, 4), 10);
};
