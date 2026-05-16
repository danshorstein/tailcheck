// TailCheck — Desktop layout (>= 920px viewport)
// Reuses primitives from components.jsx and screens from home/profile,
// but lays them out for a wide viewport with two columns and a real top bar.

const { useState: useStateD, useMemo: useMemoD, useEffect: useEffectD, useRef: useRefD } = React;

// ─────────────────────────────────────────────────────────────
// Viewport hook
// ─────────────────────────────────────────────────────────────
function useViewportMode(breakpoint = 920) {
  const [mode, setMode] = useStateD(() =>
    typeof window !== 'undefined' && window.innerWidth >= breakpoint ? 'desktop' : 'mobile'
  );
  useEffectD(() => {
    const handler = () => {
      setMode(window.innerWidth >= breakpoint ? 'desktop' : 'mobile');
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return mode;
}
window.useViewportMode = useViewportMode;

// ─────────────────────────────────────────────────────────────
// Top bar — wordmark + search + prototype badge
// ─────────────────────────────────────────────────────────────
function DesktopTopBar({ value, onChange, onSubmit, onLogoClick }) {
  const [focused, setFocused] = useStateD(false);
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(11,14,18,0.78)',
      backdropFilter: 'blur(14px) saturate(140%)',
      WebkitBackdropFilter: 'blur(14px) saturate(140%)',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        display: 'grid', gridTemplateColumns: '1fr minmax(280px, 520px) 1fr',
        alignItems: 'center', gap: 24,
        padding: '14px 32px',
      }}>
        <button onClick={onLogoClick} style={{
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          justifySelf: 'start',
        }}>
          <Wordmark size={16} />
        </button>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: C.surface, border: `1px solid ${focused ? C.borderStrong : C.border}`,
          borderRadius: 10, transition: 'border-color 0.15s',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px 0 12px' }}>
            <Icon name="search" size={14} color={C.textDim} />
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 14, color: C.textDim,
            padding: '10px 0',
          }}>N</div>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/^[nN]/, ''))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
            placeholder="Look up a tail number…"
            spellCheck={false}
            autoCapitalize="characters"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 14, color: C.text,
              padding: '10px 12px 10px 4px', letterSpacing: 0.4, fontWeight: 500,
              minWidth: 0,
            }}
          />
        </div>

        <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 8px', borderRadius: 4,
            border: `1px solid ${C.border}`, background: C.bgDeep,
            fontFamily: 'var(--font-mono)', fontSize: 10, color: C.textDim,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: 99, background: C.amber }} />
            Prototype
          </div>
        </div>
      </div>
    </div>
  );
}
window.DesktopTopBar = DesktopTopBar;

// ─────────────────────────────────────────────────────────────
// DesktopHome — hero + demo pack as grid of cards
// ─────────────────────────────────────────────────────────────
function DesktopHome({ onLookup, recents }) {
  const aircraft = window.DEMO_PACK.aircraft;
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 32px 80px' }}>
      <div style={{ maxWidth: 720 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: C.textDim,
          letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 14,
        }}>Public-records profile · U.S. tail numbers</div>
        <h1 style={{
          margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 500,
          fontSize: 44, lineHeight: 1.08, letterSpacing: -1.2, color: C.text,
          textWrap: 'balance',
        }}>
          What does the public record say about this aircraft?
        </h1>
        <p style={{
          margin: '18px 0 0', fontFamily: 'var(--font-sans)', fontSize: 16,
          lineHeight: 1.55, color: C.textMute, textWrap: 'pretty', maxWidth: 620,
        }}>
          TailCheck pulls together the FAA aircraft registry, NTSB accident records,
          FAA Service Difficulty Reports, and AIDS incidents into a single readable
          profile. Use the search above, or pick a sample below.
        </p>
      </div>

      {recents && recents.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <SectionLabel>Recent</SectionLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {recents.slice(0, 8).map((n) => (
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

      <div style={{ marginTop: 56 }}>
        <SectionLabel>Demo pack ({aircraft.length})</SectionLabel>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 14, marginTop: 4,
        }}>
          {aircraft.map((a) => (
            <DesktopAircraftCard key={a.n_number} aircraft={a} onClick={() => onLookup(a.n_number)} />
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 64, paddingTop: 24,
        borderTop: `1px solid ${C.border}`,
        fontFamily: 'var(--font-sans)', fontSize: 12, lineHeight: 1.6,
        color: C.textDim, maxWidth: 720,
      }}>
        Searches a curated demo dataset. Does not determine whether an aircraft
        is currently airworthy. Public records may be incomplete, delayed, or
        corrected after the fact.
      </div>
    </div>
  );
}
window.DesktopHome = DesktopHome;

function DesktopAircraftCard({ aircraft, onClick }) {
  const sig = SIGNAL_STYLES[aircraft.signal_summary.public_record_signal];
  const summary = aircraft.summary || buildFallbackSummary(aircraft);
  const totals =
    aircraft.records.ntsb.length +
    aircraft.records.sdr.length +
    aircraft.records.aids.length;
  const [hover, setHover] = useStateD(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 14, width: '100%',
        textAlign: 'left', cursor: 'pointer',
        background: C.surface,
        border: `1px solid ${hover ? C.borderStrong : C.border}`,
        borderRadius: 12, padding: 18,
        transition: 'border-color 0.15s, transform 0.15s',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
        WebkitAppearance: 'none',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600,
            color: C.text, letterSpacing: 0.8, lineHeight: 1,
          }}>{aircraft.display_n_number}</div>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 13, color: C.textMute,
            marginTop: 8, lineHeight: 1.4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {titleCase(aircraft.identity.manufacturer)} {titleCase(aircraft.identity.model)}
          </div>
        </div>
        <span style={{
          flexShrink: 0, width: 8, height: 8, borderRadius: 99, background: sig.dot,
          boxShadow: `0 0 8px ${sig.dot}80`, marginTop: 6,
        }} />
      </div>

      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 12, color: C.textDim,
        lineHeight: 1.5, textWrap: 'pretty',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', minHeight: 36,
      }}>
        {summary.profile_read || aircraft.demo_scenario}
      </div>

      <MiniRelevanceBar summary={summary} />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 12, borderTop: `1px solid ${C.border}`,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: sig.color,
          letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
        }}>{signalShort(aircraft.signal_summary.public_record_signal)}</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: C.textMute,
          letterSpacing: 0.4, whiteSpace: 'nowrap',
        }}>
          {aircraft.records.sdr.length} SDRs · {aircraft.records.ntsb.length} NTSB
        </span>
      </div>
    </button>
  );
}

function MiniRelevanceBar({ summary }) {
  const b = summary.safety_relevance_breakdown || {};
  const parts = [
    ['low', b.low || 0, C.neutral],
    ['moderate', b.moderate || 0, C.info],
    ['potential', b.potential || 0, C.amber],
    ['high', b.high_concern || 0, C.red],
  ];
  const total = Math.max(1, parts.reduce((sum, [, n]) => sum + n, 0));
  return (
    <div style={{ display: 'flex', height: 5, borderRadius: 99, overflow: 'hidden', background: C.bgDeep }}>
      {parts.map(([key, count, color]) => (
        <span key={key} style={{
          width: `${(count / total) * 100}%`,
          background: count ? color : 'transparent',
          opacity: count ? 0.85 : 0,
        }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DesktopProfile — 2-column profile view
// ─────────────────────────────────────────────────────────────
function DesktopProfile({
  aircraft, onBack, onOpenRecord, onOpenRaw, showRawDrawer = true,
}) {
  if (!aircraft) return null;
  const [aboutOpen, setAboutOpen] = useStateD(false);
  const [activeFilter, setActiveFilter] = useStateD('all');
  const signal = aircraft.signal_summary.public_record_signal;
  const sig = SIGNAL_STYLES[signal];
  const { ntsb, sdr, aids } = aircraft.records;
  const summary = aircraft.summary || buildFallbackSummary(aircraft);
  const totalRecords = ntsb.length + sdr.length + aids.length;
  const sdrByAta = useMemoD(() => groupBy(sdr, (r) => r.system_category || r.ata_category), [sdr]);
  const repeatedAta = (summary.repeated_category_patterns || []).map((p) => p.system_category);
  const filteredSdr = useMemoD(() => filterSdrRecords(sdr, activeFilter), [sdr, activeFilter]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 32px 80px' }}>
      {/* breadcrumb / back */}
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'transparent', border: 'none', padding: '6px 8px 6px 0',
        color: C.textMute, cursor: 'pointer', whiteSpace: 'nowrap',
        fontFamily: 'var(--font-sans)', fontSize: 13, marginBottom: 22,
      }}>
        <Icon name="back" size={14} color={C.textMute} />
        All aircraft
      </button>

      {/* Hero row */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 24, flexWrap: 'wrap', paddingBottom: 24,
        borderBottom: `1px solid ${C.border}`, marginBottom: 32,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 64, fontWeight: 600,
            lineHeight: 1, letterSpacing: 2, color: C.text,
          }}>{aircraft.display_n_number}</div>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 400,
            color: aircraft.identity.matched === false ? C.amber : C.textMute,
            marginTop: 14, letterSpacing: -0.2,
          }}>
            {aircraft.identity.matched === false ? (
              <span>No FAA registry match for this N-number</span>
            ) : (
              <>
                {titleCase(aircraft.identity.manufacturer)} {titleCase(aircraft.identity.model)} · {aircraft.identity.year_mfr}
                {aircraft.identity.serial_number && aircraft.identity.serial_number !== '(not on file)' && (
                  <span style={{ color: C.textDim, whiteSpace: 'nowrap' }}> · S/N {aircraft.identity.serial_number}</span>
                )}
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <SignalLabel label={signal} />
          <button onClick={() => setAboutOpen(true)} style={{
            background: 'transparent', border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '7px 12px',
            color: C.textMute, cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: 'var(--font-sans)', fontSize: 13,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="info" size={13} color={C.textMute} />
            About this profile
          </button>
          {showRawDrawer && (
            <button onClick={onOpenRaw} style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '7px 12px',
              color: C.textMute, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-sans)', fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="code" size={13} color={C.textMute} />
              Raw JSON
            </button>
          )}
        </div>
      </div>

      {/* Two-col grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '340px minmax(0, 1fr)',
        gap: 56,
        alignItems: 'start',
      }}>
        {/* LEFT — summary, identity, sources, timeline */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 28,
          position: 'sticky', top: 92,
        }}>
          <div>
            <TopProfileSummary aircraft={aircraft} summary={summary} onAbout={() => setAboutOpen(true)} />
          </div>

          <PublicRecordBreakdown summary={summary} />

          <SystemBreakdown summary={summary} />

          <div>
            <SubLabel>Sources searched</SubLabel>
            <div style={{ marginTop: 10 }}>
              <SourcesInlineDesktop aircraft={aircraft} />
            </div>
          </div>

          {totalRecords > 0 && (
            <div>
              <SubLabel>Lifetime timeline</SubLabel>
              <div style={{ marginTop: 10 }}>
                <LifetimeTimeline aircraft={aircraft} onPick={onOpenRecord} />
              </div>
            </div>
          )}

          <div>
            <SubLabel>Aircraft details</SubLabel>
            <div style={{ marginTop: 4 }}>
              <KV k="Manufacturer" v={titleCase(aircraft.identity.manufacturer)} mono={false} />
              <KV k="Model"        v={aircraft.identity.model} />
              <KV k="Serial #"     v={aircraft.identity.serial_number} />
              <KV k="Year"         v={aircraft.identity.year_mfr} />
              <KV k="Engine"       v={aircraft.identity.engine_make_model} mono={false} />
              <KV k="Certificate"  v={aircraft.identity.certificate_type} mono={false} />
              <KV k="Status"       v={<RegistrationStatusValue status={aircraft.identity.registration_status} />} />
              {aircraft.identity.registrant && (
                <KV k="Registrant" v={aircraft.identity.registrant} mono={false} />
              )}
              <KV k="Last action"  v={window.formatDate(aircraft.identity.last_action_date)} last />
            </div>
          </div>
        </div>

        {/* RIGHT — records */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, minWidth: 0 }}>
          <DesktopRecordsBlock
            title="Accidents & incidents"
            source="NTSB"
            count={ntsb.length}
            emptyText="No NTSB records in the searched datasets."
          >
            {ntsb.map((r, i) => (
              <DesktopRecordRow
                key={i}
                date={r.event_date}
                title={r.location || 'Unknown location'}
                meta={[r.event_type, r.injury_severity ? `${r.injury_severity} injury` : null, r.aircraft_damage].filter(Boolean).join(' · ')}
                body={r.narrative_summary}
                dot={r.ambiguous ? C.neutral : C.red}
                rightTag={r.ambiguous ? 'Ambiguous match' : null}
                onClick={() => onOpenRecord({ kind: 'ntsb', record: r })}
              />
            ))}
          </DesktopRecordsBlock>

          {sdr.length > 0 && (
            <SdrFilterBar active={activeFilter} onChange={setActiveFilter} records={sdr} />
          )}

          {sdr.length > 0 && repeatedAta.length > 0 && (
            <PatternCallout summary={summary} />
          )}

          <DesktopRecordsBlock
            title="Service difficulty reports"
            source="FAA SDR"
            count={filteredSdr.length}
            emptyText={sdr.length === 0 ? "No SDR reports in the searched datasets." : "No SDR reports match this filter."}
          >
            {filteredSdr.map((r, i) => (
              <DesktopSdrRow
                key={r.record_id || i}
                record={r}
                onClick={() => onOpenRecord({ kind: 'sdr', record: r })}
              />
            ))}
          </DesktopRecordsBlock>

          {aids.length > 0 && (
            <DesktopRecordsBlock
              title="FAA AIDS incidents"
              source="FAA AIDS"
              count={aids.length}
            >
              {aids.map((r, i) => (
                <DesktopRecordRow
                  key={i}
                  date={r.event_date}
                  title={r.location}
                  meta={`${r.aircraft_make} ${r.aircraft_model}${r.operator ? ' · ' + r.operator : ''}`}
                  body={r.narrative_summary}
                  dot={C.info}
                  onClick={() => onOpenRecord({ kind: 'aids', record: r })}
                />
              ))}
            </DesktopRecordsBlock>
          )}

          <button onClick={() => setAboutOpen(true)} style={{
            background: 'transparent', border: 'none', padding: '12px 0 0',
            textAlign: 'left', color: C.textDim, cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 12, lineHeight: 1.6,
          }}>
            Public records only — not a determination of airworthiness.
            <span style={{ color: C.textMute, marginLeft: 4, textDecoration: 'underline' }}>Read about this profile</span>
          </button>
        </div>
      </div>

      <AboutDrawer
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        aircraft={aircraft}
        sdrByAta={sdrByAta}
        repeatedAta={repeatedAta}
      />
    </div>
  );
}
window.DesktopProfile = DesktopProfile;

// ─────────────────────────────────────────────────────────────
// Sources inline — desktop layout (chips, more breathing room)
// ─────────────────────────────────────────────────────────────
function SourcesInlineDesktop({ aircraft }) {
  const items = [
    { label: 'FAA Registry', state: 'matched', count: null },
    { label: 'NTSB',         state: aircraft.records.ntsb.length > 0 ? 'hits' : 'none', count: aircraft.records.ntsb.length },
    { label: 'FAA SDR',      state: aircraft.records.sdr.length > 0 ? 'hits' : 'none',  count: aircraft.records.sdr.length },
    { label: 'FAA AIDS',     state: aircraft.records.aids.length > 0 ? 'hits' : 'none', count: aircraft.records.aids.length },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((it) => (
        <div key={it.label} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 0', gap: 10,
          fontFamily: 'var(--font-mono)', fontSize: 11.5,
          letterSpacing: 0.3, whiteSpace: 'nowrap',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 6, height: 6, borderRadius: 99,
              background: it.state === 'matched' ? C.green :
                          it.state === 'hits' ? C.info : 'transparent',
              border: it.state === 'none' ? `1px solid ${C.borderStrong}` : 'none',
            }} />
            <span style={{ color: it.state === 'none' ? C.textDim : C.textMute, textTransform: 'uppercase' }}>
              {it.label}
            </span>
          </span>
          <span style={{
            color: it.state === 'matched' ? C.green :
                   it.state === 'hits' ? C.text : C.textDim,
            fontWeight: 500,
          }}>
            {it.state === 'matched' ? 'Matched'
              : it.state === 'hits' ? `${it.count} ${it.count === 1 ? 'record' : 'records'}`
              : 'No records'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pattern callout — shows when there are repeated ATA categories
// ─────────────────────────────────────────────────────────────
function PatternCallout({ summary }) {
  const repeated = summary.repeated_category_patterns || [];
  return (
    <div style={{
      padding: 18,
      background: C.amberSoft, border: `1px solid ${C.amber}55`,
      borderRadius: 10,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        fontFamily: 'var(--font-mono)', fontSize: 10.5, color: C.amber,
        letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 500,
      }}>
        <Icon name="alert" size={12} color={C.amber} />
        Repeated-category pattern
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 13.5, lineHeight: 1.55,
        color: C.text, marginBottom: 12, textWrap: 'pretty',
      }}>
        Three or more SDRs share the same frontend system category. This is a pattern in public records, not an airworthiness judgment.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {repeated.map((pattern) => (
          <div key={pattern.system_category} style={{
            padding: '6px 10px', borderRadius: 6,
            background: C.bgDeep, border: `1px solid ${C.amber}55`,
            fontFamily: 'var(--font-mono)', fontSize: 11.5, color: C.text,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            whiteSpace: 'nowrap',
          }}>
            <span style={{ color: C.amber, fontWeight: 600 }}>{pattern.records_found}×</span>
            <span>{pattern.system_category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DesktopRecordsBlock — section header + children
// ─────────────────────────────────────────────────────────────
function DesktopRecordsBlock({ title, source, count, emptyText, children }) {
  const empty = count === 0;
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 10, marginBottom: 14, paddingBottom: 10,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 style={{
            margin: 0, fontFamily: 'var(--font-sans)', fontSize: 17,
            fontWeight: 500, color: C.text, letterSpacing: -0.1,
          }}>{title}</h2>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, color: C.textDim,
            letterSpacing: 0.3,
          }}>{count}</span>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: C.textDim,
          letterSpacing: 1, textTransform: 'uppercase',
        }}>{source}</span>
      </div>
      {empty ? (
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 13, color: C.textDim,
          padding: '6px 0', lineHeight: 1.5,
        }}>{emptyText}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function DesktopRecordRow({ date, title, meta, body, dot, rightTag, onClick }) {
  const [hover, setHover] = useStateD(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '110px 1fr auto', gap: 24,
        width: '100%', textAlign: 'left',
        background: hover ? C.surface : 'transparent', border: 'none',
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 14px', cursor: 'pointer',
        transition: 'background 0.12s',
        WebkitAppearance: 'none', alignItems: 'flex-start',
      }}>
      {/* date column */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11.5, color: C.textMute,
        letterSpacing: 0.3, paddingTop: 4,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 99, background: dot, flexShrink: 0,
        }} />
        {window.formatDate(date)}
      </div>
      {/* body column */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 500,
          color: C.text, letterSpacing: -0.1,
        }}>{title}</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10.5, color: C.textDim,
          letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 4,
        }}>{meta}</div>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 13, color: C.textMute,
          marginTop: 6, lineHeight: 1.55, textWrap: 'pretty',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{body}</div>
      </div>
      {/* right tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
        {rightTag && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9.5, color: C.amber,
            letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
            padding: '3px 7px', borderRadius: 4, whiteSpace: 'nowrap',
            background: C.amberSoft, border: `1px solid ${C.amber}33`,
          }}>{rightTag}</span>
        )}
        <Icon name="chevron-right" size={14} color={C.textDim} />
      </div>
    </button>
  );
}

function DesktopSdrRow({ record, onClick }) {
  const [hover, setHover] = useStateD(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '116px 1fr', gap: 24,
        width: '100%', textAlign: 'left',
        background: hover ? C.surface : 'transparent', border: 'none',
        borderBottom: `1px solid ${C.border}`,
        padding: '18px 14px', cursor: 'pointer',
        transition: 'background 0.12s',
      }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, color: C.textDim,
        letterSpacing: 0.3, whiteSpace: 'nowrap', paddingTop: 2,
      }}>
        {window.formatDate(record.report_date)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 15.5,
              fontWeight: 500, color: C.text, letterSpacing: -0.1,
            }}>{recordTitle(record)}</div>
            <div style={{
              marginTop: 5,
              fontFamily: 'var(--font-mono)', fontSize: 10.5, color: C.textDim,
              letterSpacing: 0.5, textTransform: 'uppercase',
            }}>
              ATA {record.ata_code} · {record.system_category || record.ata_category}
            </div>
          </div>
          <span style={{
            flexShrink: 0,
            padding: '4px 7px', borderRadius: 6,
            background: chipStyleFor({ label: relevanceLabel(record.safety_relevance) }).bg,
            border: `1px solid ${chipStyleFor({ label: relevanceLabel(record.safety_relevance) }).border}`,
            color: chipStyleFor({ label: relevanceLabel(record.safety_relevance) }).fg,
            fontFamily: 'var(--font-mono)', fontSize: 9.5,
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>{record.safety_relevance === 'high_concern' ? 'High concern' : record.safety_relevance}</span>
        </div>
        <div style={{
          marginTop: 10,
          fontFamily: 'var(--font-sans)', fontSize: 13.5,
          lineHeight: 1.5, color: C.textMute, textWrap: 'pretty',
        }}>{record.user_facing_summary || record.narrative_summary}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {(record.display_chips || []).slice(0, 7).map((chip) => (
            <ClassificationChip key={chip} label={chip} />
          ))}
        </div>
      </div>
    </button>
  );
}

function relevanceLabel(value) {
  return {
    low: 'Low apparent safety relevance',
    moderate: 'Moderate relevance',
    potential: 'Potential safety relevance',
    high_concern: 'High-concern public record',
  }[value] || 'Unknown relevance';
}

// ─────────────────────────────────────────────────────────────
// DesktopNotFound
// ─────────────────────────────────────────────────────────────
function DesktopLookupLoading({ nNumber, onBack }) {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 32px 80px' }}>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'transparent', border: 'none', padding: '6px 8px 6px 0',
        color: C.textMute, cursor: 'pointer',
        fontFamily: 'var(--font-sans)', fontSize: 13, marginBottom: 22,
      }}>
        <Icon name="back" size={14} color={C.textMute} />
        All aircraft
      </button>

      <div style={{
        padding: 24, borderRadius: 14,
        background: C.surface, border: `1px solid ${C.border}`,
        maxWidth: 560,
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
          fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 600,
          color: C.text, letterSpacing: 1, marginBottom: 10,
        }}>{nNumber}</div>
        <p style={{
          margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14,
          lineHeight: 1.55, color: C.textMute, textWrap: 'pretty',
        }}>
          Loading the matching static data shard.
        </p>
      </div>
    </div>
  );
}
window.DesktopLookupLoading = DesktopLookupLoading;

function DesktopNotFound({ nNumber, status, onBack, onLookup }) {
  const copy = window.lookupStatusCopy ? window.lookupStatusCopy(status) : {
    label: "Not in snapshot",
    body: "No active FAA registry match was found for this N-number in the current static snapshot.",
  };
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 32px 80px' }}>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'transparent', border: 'none', padding: '6px 8px 6px 0',
        color: C.textMute, cursor: 'pointer',
        fontFamily: 'var(--font-sans)', fontSize: 13, marginBottom: 22,
      }}>
        <Icon name="back" size={14} color={C.textMute} />
        All aircraft
      </button>

      <div style={{
        padding: 24, borderRadius: 14,
        background: C.surface, border: `1px solid ${C.border}`,
        maxWidth: 560,
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
          fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 600,
          color: C.text, letterSpacing: 1, marginBottom: 10,
        }}>{nNumber}</div>
        <p style={{
          margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14,
          lineHeight: 1.55, color: C.textMute, textWrap: 'pretty',
        }}>
          {copy.body}
        </p>
      </div>

      <div style={{ marginTop: 48 }}>
        <SectionLabel>Demo pack</SectionLabel>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 14, marginTop: 4,
        }}>
          {window.DEMO_PACK.aircraft.map((a) => (
            <DesktopAircraftCard key={a.n_number} aircraft={a} onClick={() => onLookup(a.n_number)} />
          ))}
        </div>
      </div>
    </div>
  );
}
window.DesktopNotFound = DesktopNotFound;
