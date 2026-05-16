// TailCheck — Home, Not-Found, Camera, Confirm screens
// Loaded as <script type="text/babel">

const { useState, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────
// Home — brand, search input, photo CTA, demo aircraft list
// ─────────────────────────────────────────────────────────────
function HomeScreen({ onLookup, onOpenCamera, density = 'comfortable', recents = [] }) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);

  const submit = () => {
    const n = window.normalizeNNumber(q);
    if (!n) return;
    onLookup(n);
  };

  const dense = density === 'compact';
  const aircraft = window.DEMO_PACK.aircraft;

  return (
    <div style={{
      padding: '6px 20px 80px',
      display: 'flex', flexDirection: 'column', gap: dense ? 20 : 26,
    }}>
      {/* Top brand bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 4,
      }}>
        <Wordmark size={15} />
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 7px', borderRadius: 4,
          border: `1px solid ${C.border}`, background: C.bgDeep,
          fontFamily: 'var(--font-mono)', fontSize: 9.5, color: C.textDim,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 99, background: C.amber }} />
          Prototype
        </div>
      </div>

      {/* Title block */}
      <div style={{ marginTop: 8 }}>
        <h1 style={{
          margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 500,
          fontSize: 26, lineHeight: 1.15, letterSpacing: -0.6, color: C.text,
          textWrap: 'pretty',
        }}>
          Look up an aircraft's public-records profile.
        </h1>
        <p style={{
          margin: '10px 0 0', fontFamily: 'var(--font-sans)', fontSize: 13.5,
          lineHeight: 1.5, color: C.textMute, textWrap: 'pretty',
        }}>
          Enter a U.S. tail number to view the static FAA registry, NTSB, and
          service-difficulty snapshot.
        </p>
      </div>

      {/* Search input — single line, no separate button */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        background: C.surface, border: `1px solid ${focused ? C.borderStrong : C.border}`,
        borderRadius: 12, transition: 'border-color 0.15s',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px 0 14px' }}>
          <Icon name="search" size={15} color={C.textDim} />
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 16, color: C.textDim,
          padding: '14px 0',
        }}>N</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value.replace(/^[nN]/, ''))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="123AB"
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 16, color: C.text,
            padding: '14px 4px', letterSpacing: 0.4, fontWeight: 500,
            minWidth: 0,
          }}
        />
        <button onClick={onOpenCamera} style={{
          background: 'transparent', border: 'none',
          padding: '0 14px', height: '100%', display: 'flex', alignItems: 'center',
          color: C.textMute, cursor: 'pointer',
        }} aria-label="Scan with camera">
          <Icon name="camera" size={19} color={C.textMute} />
        </button>
      </div>
      <style>{`
        input::placeholder { color: ${C.textDim}; }
      `}</style>

      {/* Recent searches */}
      {recents && recents.length > 0 && (
        <div>
          <SectionLabel>Recent</SectionLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {recents.slice(0, 5).map((n) => (
              <button
                key={n}
                onClick={() => onLookup(n)}
                style={{
                  padding: '6px 10px', borderRadius: 6,
                  background: C.surface, border: `1px solid ${C.border}`,
                  fontFamily: 'var(--font-mono)', fontSize: 12, color: C.text,
                  cursor: 'pointer', letterSpacing: 0.3,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Icon name="history" size={11} color={C.textDim} />
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Demo aircraft list */}
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10.5, color: C.textDim,
          letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
        }}>Demo pack</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {aircraft.map((a) => (
            <DemoAircraftRow key={a.n_number} aircraft={a} onClick={() => onLookup(a.n_number)} />
          ))}
        </div>
      </div>

      {/* Footer microcopy */}
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 11.5, lineHeight: 1.55,
        color: C.textDim, padding: '0 2px',
      }}>
        Searches a public-record snapshot. Does not determine whether an
        aircraft is currently airworthy.
      </div>
    </div>
  );
}
window.HomeScreen = HomeScreen;

// Single row in the demo pack list — minimal
function DemoAircraftRow({ aircraft, onClick }) {
  const s = SIGNAL_STYLES[aircraft.signal_summary.public_record_signal];
  const summary = aircraft.summary || buildFallbackSummary(aircraft);
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      background: 'transparent', border: 'none',
      borderTop: `1px solid ${C.border}`,
      padding: '14px 2px', textAlign: 'left',
      cursor: 'pointer', WebkitAppearance: 'none',
    }}>
      {/* status dot */}
      <span style={{
        flexShrink: 0, width: 7, height: 7, borderRadius: 99, background: s.dot,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
          color: C.text, letterSpacing: 0.4,
        }}>{aircraft.display_n_number}</div>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 12.5, color: C.textMute,
          marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {titleCase(aircraft.identity.manufacturer)} {titleCase(aircraft.identity.model)}
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 11.5, color: C.textDim,
          marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {summary.profile_read} · {summary.sdr_records_found} SDRs · {summary.ntsb_records_found} NTSB
        </div>
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9.5, color: s.color,
        letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
        flexShrink: 0,
      }}>
        {signalShort(aircraft.signal_summary.public_record_signal)}
      </span>
      <Icon name="chevron-right" size={14} color={C.textDim} />
    </button>
  );
}

function signalShort(s) {
  return {
    "No major public records found": "Clean",
    "Some public records found":     "Records",
    "Elevated public-records signal":"Elevated",
    "Incomplete / ambiguous data":   "Ambiguous",
  }[s] || s;
}
window.signalShort = signalShort;

function titleCase(s) {
  if (!s) return '';
  return s.replace(/\w\S*/g, (w) => {
    if (/^[A-Z0-9-]+$/.test(w) && w.length <= 3) return w; // keep short codes like SR22
    if (/^[A-Z]+-\d/.test(w)) return w; // PA-28-181
    return w[0] + w.slice(1).toLowerCase();
  });
}
window.titleCase = titleCase;

// ─────────────────────────────────────────────────────────────
// NotFound — N-number not in demo pack
// ─────────────────────────────────────────────────────────────
function lookupStatusCopy(status) {
  if (status === "invalid_n_number") {
    return {
      label: "Invalid tail number",
      body: "Enter a U.S. N-number such as N62849. TailCheck normalizes spacing and punctuation before searching the static snapshot.",
    };
  }
  if (status === "data_unavailable") {
    return {
      label: "Snapshot unavailable",
      body: "The static public-record snapshot could not be loaded. If you are running locally, generate frontend/public/data or use one of the bundled demo profiles.",
    };
  }
  return {
    label: "Not in snapshot",
    body: "No active FAA registry match was found for this N-number in the current static snapshot. The aircraft may be deregistered, reserved, foreign-registered, recently changed, or the tail number may contain a typo.",
  };
}
window.lookupStatusCopy = lookupStatusCopy;

function LookupLoading({ nNumber, onBack }) {
  return (
    <div style={{ padding: '6px 16px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'transparent', border: 'none', padding: '6px 0',
        color: C.textMute, cursor: 'pointer',
        fontFamily: 'var(--font-sans)', fontSize: 13,
        alignSelf: 'flex-start',
      }}>
        <Icon name="back" size={14} color={C.textMute} />
        Back
      </button>
      <div style={{
        padding: 20, borderRadius: 14,
        background: C.surface, border: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 1.2,
          color: C.info, textTransform: 'uppercase', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="search" size={12} color={C.info} />
          Searching snapshot
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600,
          color: C.text, letterSpacing: 0.5, marginBottom: 8,
        }}>{nNumber}</div>
        <p style={{
          margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13.5,
          lineHeight: 1.55, color: C.textMute,
        }}>
          Loading the matching static data shard.
        </p>
      </div>
    </div>
  );
}
window.LookupLoading = LookupLoading;

function NotFoundScreen({ nNumber, status, onBack, onLookup }) {
  const copy = lookupStatusCopy(status);
  return (
    <div style={{ padding: '6px 16px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'transparent', border: 'none', padding: '6px 0',
        color: C.textMute, cursor: 'pointer',
        fontFamily: 'var(--font-sans)', fontSize: 13,
        alignSelf: 'flex-start',
      }}>
        <Icon name="back" size={14} color={C.textMute} />
        Back
      </button>

      <div style={{
        padding: 20, borderRadius: 14,
        background: C.surface, border: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 1.2,
          color: C.amber, textTransform: 'uppercase', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="alert" size={12} color={C.amber} />
          {copy.label}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600,
          color: C.text, letterSpacing: 0.5, marginBottom: 8,
        }}>{nNumber}</div>
        <p style={{
          margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13.5,
          lineHeight: 1.55, color: C.textMute,
        }}>
          {copy.body}
        </p>
      </div>

      <SectionLabel>Demo pack</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {window.DEMO_PACK.aircraft.map((a) => (
          <DemoAircraftRow key={a.n_number} aircraft={a} onClick={() => onLookup(a.n_number)} />
        ))}
      </div>
    </div>
  );
}
window.NotFoundScreen = NotFoundScreen;
