// TailCheck — simplified mobile prototype frame
// Loaded as <script type="text/babel">
// Exports the same component names as the earlier iOS mock, but no longer
// renders fake phone status icons, dynamic island, or home indicator.

function IOSStatusBar() {
  return null;
}

function IOSGlassPill({ children, style = {} }) {
  return (
    <div style={{
      minHeight: 44,
      minWidth: 44,
      borderRadius: 9999,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
    }}>
      {children}
    </div>
  );
}

function IOSNavBar({ title = 'Title' }) {
  return (
    <div style={{
      padding: '18px 16px 10px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 28,
      fontWeight: 700,
      lineHeight: '34px',
      color: '#fff',
    }}>
      {title}
    </div>
  );
}

function IOSListRow({ title, detail, chevron = true, isLast = false, dark = false }) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', minHeight: 52,
      padding: '0 16px', position: 'relative',
      fontFamily: '-apple-system, system-ui', fontSize: 17,
    }}>
      <div style={{ flex: 1, color: text }}>{title}</div>
      {detail && <span style={{ color: sec, marginRight: 6 }}>{detail}</span>}
      {chevron && <span style={{ color: sec }}>›</span>}
      {!isLast && <div style={{ position: 'absolute', bottom: 0, left: 16, right: 0, height: 0.5, background: sep }} />}
    </div>
  );
}

function IOSList({ header, children, dark = false }) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return (
    <div>
      {header && (
        <div style={{
          fontFamily: '-apple-system, system-ui', fontSize: 13,
          color: hc, textTransform: 'uppercase',
          padding: '8px 36px 6px', letterSpacing: -0.08,
        }}>{header}</div>
      )}
      <div style={{ background: bg, borderRadius: 26, margin: '0 16px', overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function IOSDevice({ children, width = 402, height = 874, dark = false, title, keyboard = false }) {
  return (
    <div style={{
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#0B0E12' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {title !== undefined && <IOSNavBar title={title} dark={dark} />}
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
        {keyboard && <IOSKeyboard dark={dark} />}
      </div>
    </div>
  );
}

function IOSKeyboard({ dark = false }) {
  return (
    <div style={{
      padding: 16,
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)',
      borderTop: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.06)',
      fontFamily: '-apple-system, system-ui',
      color: dark ? '#fff' : '#000',
    }} />
  );
}

Object.assign(window, {
  IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard,
});