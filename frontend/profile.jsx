// TailCheck — Aircraft profile screen (calm mobile rebuild)
// Loaded as <script type="text/babel">

const { useState: useStateP, useMemo: useMemoP } = React;

// ─────────────────────────────────────────────────────────────
// ProfileScreen — calm, breathing-room first
// ─────────────────────────────────────────────────────────────
function ProfileScreen({
  aircraft, onBack, density = 'comfortable',
  showSourceStrip = true, showRawDrawer = true,
  onOpenRecord, onOpenRaw,
}) {
  if (!aircraft) return null;
  const [identityOpen, setIdentityOpen] = useStateP(false);
  const [aboutOpen, setAboutOpen]     = useStateP(false);
  const [menuOpen, setMenuOpen]       = useStateP(false);
  const [activeFilter, setActiveFilter] = useStateP('all');

  const dense = density === 'compact';
  const gap = dense ? 22 : 28;

  const signal = aircraft.signal_summary.public_record_signal;
  const sig = SIGNAL_STYLES[signal];
  const { ntsb, sdr, aids } = aircraft.records;
  const summary = aircraft.summary || buildFallbackSummary(aircraft);
  const totalRecords = ntsb.length + sdr.length + aids.length;
  const sdrByAta = useMemoP(() => groupBy(sdr, (r) => r.system_category || r.ata_category), [sdr]);
  const repeatedAta = (summary.repeated_category_patterns || []).map((p) => p.system_category);
  const filteredSdr = useMemoP(() => filterSdrRecords(sdr, activeFilter), [sdr, activeFilter]);

  return (
    <div style={{ paddingBottom: 56 }}>
      {/* ── Sub-nav: minimal ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '2px 8px 4px', position: 'relative',
      }}>
        <button onClick={onBack} aria-label="Back" style={{
          width: 40, height: 40, background: 'transparent', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: C.text,
        }}>
          <Icon name="back" size={20} color={C.text} />
        </button>
        <button onClick={() => setMenuOpen(!menuOpen)} aria-label="More" style={{
          width: 40, height: 40, background: 'transparent', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: C.textMute,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="5" cy="12" r="1.6" fill={C.textMute} />
            <circle cx="12" cy="12" r="1.6" fill={C.textMute} />
            <circle cx="19" cy="12" r="1.6" fill={C.textMute} />
          </svg>
        </button>
        {menuOpen && (
          <MoreMenu
            onClose={() => setMenuOpen(false)}
            onRaw={showRawDrawer ? () => { setMenuOpen(false); onOpenRaw(); } : null}
            onAbout={() => { setMenuOpen(false); setAboutOpen(true); }}
          />
        )}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap }}>

        {/* ── Hero: just the essentials ───────────────────────── */}
        <div style={{ paddingTop: 4 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 38, fontWeight: 600,
            lineHeight: 1, letterSpacing: 1.5, color: C.text,
          }}>{aircraft.display_n_number}</div>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 400,
            color: aircraft.identity.matched === false ? C.amber : C.textMute,
            marginTop: 10, letterSpacing: -0.1,
          }}>
            {aircraft.identity.matched === false
              ? 'No FAA registry match'
              : `${titleCase(aircraft.identity.manufacturer)} ${titleCase(aircraft.identity.model)} · ${aircraft.identity.year_mfr}`}
          </div>
        </div>

        <TopProfileSummary aircraft={aircraft} summary={summary} onAbout={() => setAboutOpen(true)} />

        <PublicRecordBreakdown summary={summary} />

        <SystemBreakdown summary={summary} />

        {/* ── Sources: a single quiet line ───────────────────── */}
        {showSourceStrip && (
          <SourcesInline aircraft={aircraft} />
        )}

        {/* ── Timeline (no legend, no footer) ─────────────────── */}
        {totalRecords > 0 && (
          <LifetimeTimeline aircraft={aircraft} onPick={onOpenRecord} />
        )}

        {/* ── NTSB ────────────────────────────────────────────── */}
        <RecordsBlock
          title="Accidents & incidents"
          source="NTSB"
          records={ntsb}
          emptyText="No NTSB records in the searched datasets."
          renderItem={(r, i) => (
            <NtsbCard key={i} record={r} onOpen={() => onOpenRecord({ kind: 'ntsb', record: r })} />
          )}
        />

        {/* ── SDR ─────────────────────────────────────────────── */}
        <RecordsBlock
          title="Service difficulty reports"
          source="FAA SDR"
          records={filteredSdr}
          rightChip={repeatedAta.length > 0 && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9.5, color: C.amber,
              letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 500,
            }}>· repeated</span>
          )}
          emptyText={sdr.length === 0 ? "No SDR reports in the searched datasets." : "No SDR reports match this filter."}
          beforeList={sdr.length > 0 && (
            <SdrFilterBar active={activeFilter} onChange={setActiveFilter} records={sdr} />
          )}
          renderItem={(r, i) => (
            <SdrCard key={r.record_id || i} record={r} onOpen={() => onOpenRecord({ kind: 'sdr', record: r })} repeated={(r.event_flags || []).includes('repeat_category_member')} />
          )}
        />

        {/* ── AIDS (only if present) ─────────────────────────── */}
        {aids.length > 0 && (
          <RecordsBlock
            title="FAA AIDS incidents"
            source="FAA AIDS"
            records={aids}
            renderItem={(r, i) => (
              <AidsCard key={i} record={r} onOpen={() => onOpenRecord({ kind: 'aids', record: r })} />
            )}
          />
        )}

        {/* ── Identity (collapsed) ───────────────────────────── */}
        <IdentityExpander
          open={identityOpen}
          onToggle={() => setIdentityOpen(!identityOpen)}
          identity={aircraft.identity}
        />

        {/* ── Footer: subtle limitations link ─────────────────── */}
        <button onClick={() => setAboutOpen(true)} style={{
          background: 'transparent', border: 'none', padding: '8px 0 0',
          textAlign: 'left', color: C.textDim, cursor: 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: 11.5, lineHeight: 1.55,
        }}>
          Public records only — not a determination of airworthiness.
          <span style={{ color: C.textMute, marginLeft: 4, textDecoration: 'underline' }}>Read more</span>
        </button>
      </div>

      {/* About / limitations drawer */}
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
window.ProfileScreen = ProfileScreen;

// ─────────────────────────────────────────────────────────────
// MoreMenu
// ─────────────────────────────────────────────────────────────
function MoreMenu({ onClose, onRaw, onAbout }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 30, background: 'transparent',
      }} />
      <div style={{
        position: 'absolute', top: 42, right: 8, zIndex: 40,
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 4, minWidth: 180,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}>
        <MenuItem icon="info"   label="About this profile" onClick={onAbout} />
        {onRaw && <MenuItem icon="code" label="View raw record" onClick={onRaw} />}
        <MenuItem icon="share"  label="Share" onClick={onClose} />
      </div>
    </>
  );
}
function MenuItem({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
      padding: '9px 10px', borderRadius: 6,
      background: 'transparent', border: 'none', textAlign: 'left',
      color: C.text, cursor: 'pointer',
      fontFamily: 'var(--font-sans)', fontSize: 13,
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceElev}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <Icon name={icon} size={14} color={C.textMute} />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// SourcesInline — one quiet row
// ─────────────────────────────────────────────────────────────
function SourcesInline({ aircraft }) {
  const items = [
    { label: 'FAA Registry', state: 'matched' },
    { label: 'NTSB',         state: aircraft.records.ntsb.length > 0 ? 'hits' : 'none', count: aircraft.records.ntsb.length },
    { label: 'FAA SDR',      state: aircraft.records.sdr.length > 0 ? 'hits' : 'none',  count: aircraft.records.sdr.length },
    { label: 'FAA AIDS',     state: aircraft.records.aids.length > 0 ? 'hits' : 'none', count: aircraft.records.aids.length },
  ];
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '6px 14px',
      fontFamily: 'var(--font-mono)', fontSize: 10.5, color: C.textDim,
      letterSpacing: 0.3, textTransform: 'uppercase',
    }}>
      <span style={{ color: C.textDim }}>Sources</span>
      {items.map((it) => (
        <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 5, height: 5, borderRadius: 99,
            background: it.state === 'matched' ? C.green :
                        it.state === 'hits' ? C.info : 'transparent',
            border: it.state === 'none' ? `1px solid ${C.borderStrong}` : 'none',
          }} />
          <span style={{ color: it.state === 'none' ? C.textDim : C.textMute }}>{it.label}</span>
          {it.count != null && it.count > 0 && (
            <span style={{ color: C.text, fontWeight: 500 }}>{it.count}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LifetimeTimeline — smaller, no legend
// ─────────────────────────────────────────────────────────────
function LifetimeTimeline({ aircraft, onPick }) {
  const events = [];
  aircraft.records.ntsb.forEach((r) => events.push({ kind: 'ntsb', date: r.event_date, record: r, color: C.red }));
  aircraft.records.sdr.forEach((r)  => events.push({ kind: 'sdr',  date: r.report_date, record: r, color: C.amber }));
  aircraft.records.aids.forEach((r) => events.push({ kind: 'aids', date: r.event_date,  record: r, color: C.info }));

  const yearMfr = parseInt(aircraft.identity.year_mfr || '2000', 10);
  const minYear = Math.min(yearMfr, ...events.map((e) => window.yearFrom(e.date) || yearMfr));
  const maxYear = Math.max(2026, ...events.map((e) => window.yearFrom(e.date) || 2026));
  const span = Math.max(1, maxYear - minYear);
  const xPct = (iso) => ((window.yearFrom(iso) || minYear) - minYear) / span * 100;
  const yearXPct = (y) => (y - minYear) / span * 100;

  const ticks = [minYear, Math.round(minYear + span * 0.5), maxYear];

  return (
    <div style={{ padding: '4px 4px 0' }}>
      <div style={{ position: 'relative', height: 38 }}>
        {/* baseline */}
        <div style={{
          position: 'absolute', top: 14, left: 0, right: 0,
          height: 1, background: C.border,
        }} />
        {/* ticks */}
        {ticks.map((y) => (
          <div key={y} style={{
            position: 'absolute', top: 22, left: `${yearXPct(y)}%`,
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-mono)', fontSize: 9.5, color: C.textDim,
            letterSpacing: 0.3,
          }}>{y}</div>
        ))}
        {/* manufacture marker */}
        <div style={{
          position: 'absolute', top: 14, left: `${yearXPct(yearMfr)}%`,
          transform: 'translate(-50%, -50%)',
          width: 6, height: 6, borderRadius: 99,
          background: C.bg, border: `1.5px solid ${C.textDim}`,
        }} title="Year manufactured" />
        {/* events */}
        {events.map((e, i) => (
          <button key={i}
            onClick={() => onPick && onPick({ kind: e.kind, record: e.record })}
            title={`${window.formatDate(e.date)}`}
            style={{
              position: 'absolute', top: 14, left: `${xPct(e.date)}%`,
              transform: 'translate(-50%, -50%)',
              width: 11, height: 11, borderRadius: 99,
              background: e.color, border: `2px solid ${C.bg}`,
              cursor: 'pointer', padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RecordsBlock — title + cards
// ─────────────────────────────────────────────────────────────
function RecordsBlock({ title, source, records, renderItem, emptyText, rightChip, beforeList }) {
  if (records.length === 0) {
    return (
      <div>
        <BlockHeader title={title} count={0} source={source} />
        {beforeList && <div style={{ marginBottom: 12 }}>{beforeList}</div>}
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 12.5, color: C.textDim,
          padding: '0 2px', lineHeight: 1.5,
        }}>{emptyText}</div>
      </div>
    );
  }
  return (
    <div>
      <BlockHeader title={title} count={records.length} source={source} rightChip={rightChip} />
      {beforeList && <div style={{ marginBottom: 12 }}>{beforeList}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {records.map((r, i) => renderItem(r, i))}
      </div>
    </div>
  );
}

function BlockHeader({ title, count, source, rightChip }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 8, marginBottom: 12, padding: '0 2px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 6,
        fontFamily: 'var(--font-sans)', fontSize: 14, color: C.text, fontWeight: 500,
      }}>
        {title}
        <span style={{ color: C.textDim, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 400 }}>
          {count}
        </span>
        {rightChip}
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9.5, color: C.textDim,
        letterSpacing: 0.8, textTransform: 'uppercase',
      }}>{source}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Record cards — minimal
// ─────────────────────────────────────────────────────────────
function NtsbCard({ record, onOpen }) {
  return (
    <RecordRow onClick={onOpen} dot={C.red}
      date={record.event_date}
      title={`${record.location}`}
      subtitle={record.narrative_summary}
      meta={`${record.injury_severity || 'No'} injury · ${record.aircraft_damage}`}
    />
  );
}
function SdrCard({ record, onOpen, repeated }) {
  return (
    <button onClick={onOpen} style={{
      width: '100%', textAlign: 'left',
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: 14, cursor: 'pointer',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500,
            color: C.text, letterSpacing: -0.15,
          }}>{recordTitle(record)}</div>
          <div style={{
            marginTop: 5,
            fontFamily: 'var(--font-mono)', fontSize: 10.5,
            color: C.textDim, letterSpacing: 0.4, textTransform: 'uppercase',
          }}>
            {window.formatDate(record.report_date)} · ATA {record.ata_code} · {record.system_category || record.ata_category}
          </div>
        </div>
        <span style={{
          flexShrink: 0, width: 7, height: 7, borderRadius: 99,
          background: relevanceColor(record.safety_relevance), marginTop: 5,
          boxShadow: `0 0 8px ${relevanceColor(record.safety_relevance)}55`,
        }} />
      </div>
      <div style={{
        marginTop: 10, fontFamily: 'var(--font-sans)', fontSize: 13,
        color: C.textMute, lineHeight: 1.5, textWrap: 'pretty',
      }}>
        {record.user_facing_summary || record.narrative_summary}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {(record.display_chips || []).slice(0, 6).map((chip) => (
          <ClassificationChip key={chip} label={chip} />
        ))}
      </div>
    </button>
  );
}
function AidsCard({ record, onOpen }) {
  return (
    <RecordRow onClick={onOpen} dot={C.info}
      date={record.event_date}
      title={record.location}
      subtitle={record.narrative_summary}
      meta={record.aircraft_make + ' ' + record.aircraft_model}
    />
  );
}
function TopProfileSummary({ aircraft, summary, onAbout }) {
  const activityColor = summary.public_record_signal === 'notable' ? C.amber :
    summary.public_record_signal === 'elevated' ? C.amber :
    summary.public_record_signal === 'moderate' ? C.info :
    summary.public_record_signal === 'low' ? C.neutral : C.green;
  return (
    <div style={{
      padding: 16,
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginBottom: 14,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10.5, color: C.textDim,
          letterSpacing: 1.2, textTransform: 'uppercase',
        }}>Profile summary</div>
        <button onClick={onAbout} style={{
          background: 'transparent', border: 'none', padding: 0,
          color: C.textMute, cursor: 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: 12.5,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          About
          <Icon name="info" size={12} color={C.textMute} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <SummaryMetric label="Public-record activity" value={summary.public_record_activity || signalTitle(summary.public_record_signal)} color={activityColor} />
        <SummaryMetric label="NTSB accidents/incidents" value={summary.ntsb_records_found ? `${summary.ntsb_records_found} found` : 'None found'} color={summary.ntsb_records_found ? C.amber : C.green} />
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 500,
          color: C.text, letterSpacing: -0.25, lineHeight: 1.25,
        }}>{summary.profile_read || summary.profile_summary_label}</div>
        <div style={{
          marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 13,
          color: C.textMute, lineHeight: 1.45,
        }}>
          Most notable factor: <span style={{ color: C.text }}>{summary.most_notable_factor}</span>
        </div>
      </div>

      <div style={{
        marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`,
        fontFamily: 'var(--font-sans)', fontSize: 11.5, color: C.textDim,
        lineHeight: 1.5,
      }}>
        {aircraft.snapshot_generated_at && (
          <div style={{ marginBottom: 6, color: C.textMute }}>
            Snapshot generated {window.formatDate(aircraft.snapshot_generated_at)}
          </div>
        )}
        {summary.disclaimer || 'Public records only — not a complete maintenance history or FAA airworthiness determination.'}
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, color }) {
  return (
    <div style={{ padding: '10px 11px', background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 8 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9.5, color: C.textDim,
        textTransform: 'uppercase', letterSpacing: 0.8,
      }}>{label}</div>
      <div style={{
        marginTop: 5, fontFamily: 'var(--font-sans)', fontSize: 13,
        color, fontWeight: 500, lineHeight: 1.2,
      }}>{value}</div>
    </div>
  );
}

function PublicRecordBreakdown({ summary }) {
  const b = summary.safety_relevance_breakdown || {};
  const rows = [
    ['Low apparent safety relevance', b.low || 0, C.neutral],
    ['Moderate safety relevance', b.moderate || 0, C.info],
    ['Potential safety relevance', b.potential || 0, C.amber],
    ['High-concern public records', b.high_concern || 0, C.red],
  ];
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div>
      <BlockHeader title="Public-record breakdown" count={summary.sdr_records_found || 0} source="SDR relevance" />
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 9,
        padding: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
      }}>
        {rows.map(([label, count, color]) => (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: C.textMute }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: count ? color : C.textDim }}>{count}</span>
            </div>
            <div style={{ height: 6, background: C.bgDeep, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                width: `${(count / max) * 100}%`,
                height: '100%', background: color, opacity: count ? 0.85 : 0,
                borderRadius: 99,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemBreakdown({ summary }) {
  const systems = Object.entries(summary.system_breakdown || {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (systems.length === 0) return null;
  return (
    <div>
      <BlockHeader title="Systems represented" count={systems.length} source="SDR categories" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {systems.map(([name, count]) => (
          <span key={name} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '7px 9px', borderRadius: 7,
            background: chipStyleFor({ label: name }).bg,
            border: `1px solid ${chipStyleFor({ label: name }).border}`,
            color: chipStyleFor({ label: name }).fg,
            fontFamily: 'var(--font-sans)', fontSize: 12.5,
          }}>
            {name}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: C.text }}>{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SdrFilterBar({ active, onChange, records }) {
  const filters = [
    ['all', 'All'],
    ['routine', 'Routine / low relevance'],
    ['potential', 'Potential safety relevance'],
    ['notable', 'Notable events'],
    ['repeated', 'Repeated patterns'],
    ['engine', 'Engine / pneumatic'],
    ['doors', 'Doors / structure'],
    ['emergency', 'Emergency equipment'],
    ['brakes', 'Landing gear / brakes'],
    ['cabin', 'Cabin / service'],
  ];
  return (
    <div style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '0 2px 4px' }}>
      {filters.map(([key, label]) => {
        const selected = active === key;
        const count = filterSdrRecords(records, key).length;
        return (
          <button key={key} onClick={() => onChange(key)} style={{
            flexShrink: 0,
            padding: '7px 9px', borderRadius: 7,
            background: selected ? C.surfaceElev : 'transparent',
            border: `1px solid ${selected ? C.borderStrong : C.border}`,
            color: selected ? C.text : C.textMute,
            fontFamily: 'var(--font-sans)', fontSize: 12,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {label}
            <span style={{ marginLeft: 5, color: selected ? C.textMute : C.textDim, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function RecordRow({ onClick, dot, date, title, subtitle, meta }) {
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left',
      background: 'transparent', border: 'none',
      padding: '4px 0', cursor: 'pointer',
      borderTop: `1px solid ${C.border}`,
      paddingTop: 12, paddingBottom: 4,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--font-mono)', fontSize: 10.5, color: C.textDim,
        letterSpacing: 0.4, textTransform: 'uppercase',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 99, background: dot,
        }} />
        <span style={{ color: C.textMute }}>{window.formatDate(date)}</span>
        <span style={{ color: C.textDim }}>· {meta}</span>
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
        color: C.text, marginTop: 6, letterSpacing: -0.1,
      }}>{title}</div>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 12.5, color: C.textMute,
        marginTop: 4, lineHeight: 1.5, textWrap: 'pretty',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>{subtitle}</div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// IdentityExpander — collapsed by default
// ─────────────────────────────────────────────────────────────
function IdentityExpander({ open, onToggle, identity }) {
  return (
    <div>
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '14px 0',
        background: 'transparent',
        border: 'none',
        borderTop: `1px solid ${C.border}`,
        borderBottom: open ? 'none' : `1px solid ${C.border}`,
        cursor: 'pointer', WebkitAppearance: 'none',
      }}>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
          color: C.text,
        }}>Aircraft details</span>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} color={C.textMute} />
      </button>
      {open && (
        <div style={{ padding: '0 0 8px' }}>
          <KV k="Manufacturer" v={titleCase(identity.manufacturer)} mono={false} />
          <KV k="Model"        v={identity.model} />
          <KV k="Serial #"     v={identity.serial_number} />
          <KV k="Year"         v={identity.year_mfr} />
          <KV k="Type"         v={identity.aircraft_type} mono={false} />
          <KV k="Engine"       v={identity.engine_make_model} mono={false} />
          <KV k="Certificate"  v={identity.certificate_type} mono={false} />
          <KV k="Status"       v={
            <RegistrationStatusValue status={identity.registration_status} />
          } />
          <KV k="Last action"  v={window.formatDate(identity.last_action_date)} last />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AboutDrawer — folds in findings, confidence, ATA breakdown, limitations
// ─────────────────────────────────────────────────────────────
function AboutDrawer({ open, onClose, aircraft, sdrByAta, repeatedAta }) {
  if (!aircraft) return <Drawer open={open} onClose={onClose} />;
  const s = aircraft.signal_summary;
  const summary = aircraft.summary || buildFallbackSummary(aircraft);
  return (
    <Drawer open={open} onClose={onClose}
      subtitle="About this profile"
      title={`${aircraft.display_n_number} · public-record context`}
    >
      <div style={{ marginBottom: 18 }}>
        <TopProfileSummary aircraft={aircraft} summary={summary} onAbout={() => {}} />
      </div>

      {/* Confidence */}
      <div style={{
        display: 'flex', gap: 24, marginBottom: 18,
      }}>
        <ConfidenceBlock label="Identity"      level={s.identity_confidence} />
        <ConfidenceBlock label="Data coverage" level={s.data_confidence} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <SubLabel>How to read this</SubLabel>
        {[
          "TailCheck searches public records only.",
          "FAA Service Difficulty Reports are not the same thing as accidents.",
          "More records do not automatically mean there is an airworthiness issue.",
          "Some records describe routine maintenance or serviceability findings.",
          "Some records may involve systems with greater apparent safety relevance.",
          "TailCheck does not make FAA airworthiness determinations.",
          "Tail numbers can be reassigned; serial-number matching matters.",
        ].map((f, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, padding: '8px 0',
            fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.5,
            color: C.text,
          }}>
            <span style={{
              flexShrink: 0, marginTop: 7,
              width: 4, height: 4, borderRadius: 99, background: C.textMute,
            }} />
            <span style={{ textWrap: 'pretty' }}>{f}</span>
          </div>
        ))}
      </div>

      {summary.repeated_category_patterns && summary.repeated_category_patterns.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SubLabel>Repeated-category patterns</SubLabel>
          {summary.repeated_category_patterns.map((pattern) => (
            <div key={pattern.system_category} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0',
              fontFamily: 'var(--font-mono)', fontSize: 12, color: C.text,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: 99, background: C.amber,
                }} />
                <span>{pattern.system_category}</span>
              </span>
              <span style={{ color: C.amber, fontWeight: 500 }}>{pattern.records_found} records</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <SubLabel>Limitations</SubLabel>
        {(summary.limitations || s.limitations || []).map((l, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, padding: '6px 0',
            fontFamily: 'var(--font-sans)', fontSize: 12.5, lineHeight: 1.5,
            color: C.textMute,
          }}>
            <span style={{ flexShrink: 0, color: C.textDim }}>·</span>
            <span style={{ textWrap: 'pretty' }}>{l}</span>
          </div>
        ))}
        <div style={{
          marginTop: 10, padding: '10px 12px',
          background: C.bgDeep, border: `1px solid ${C.border}`,
          borderRadius: 8,
          fontFamily: 'var(--font-sans)', fontSize: 11.5, lineHeight: 1.55,
          color: C.textDim,
        }}>
          {summary.disclaimer || 'Public records only — not a complete maintenance history or FAA airworthiness determination.'}
        </div>
      </div>
    </Drawer>
  );
}

function SubLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 9.5, color: C.textDim,
      letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 6,
    }}>{children}</div>
  );
}

function ConfidenceBlock({ label, level }) {
  return (
    <div>
      <SubLabel>{label}</SubLabel>
      <ConfidenceMeter level={level} />
    </div>
  );
}

function ClassificationChip({ label }) {
  const s = chipStyleFor({ label });
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 7px', borderRadius: 6,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.fg, fontFamily: 'var(--font-sans)', fontSize: 11.5,
      lineHeight: 1.1, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function chipStyleFor({ label }) {
  const text = String(label || '').toLowerCase();
  if (text.includes('high-concern')) return { bg: C.redSoft, border: `${C.red}66`, fg: C.red };
  if (text.includes('potential') || text.includes('repeated') || text.includes('follow-up')) return { bg: C.amberSoft, border: `${C.amber}66`, fg: C.amber };
  if (text.includes('corrective') || text.includes('no fault') || text.includes('inspected')) return { bg: C.greenSoft, border: `${C.green}55`, fg: C.green };
  if (text.includes('emergency equipment')) return { bg: C.infoSoft, border: `${C.info}55`, fg: C.info };
  if (text.includes('engine') || text.includes('brake') || text.includes('door')) return { bg: C.amberSoft, border: `${C.amber}44`, fg: C.text };
  if (text.includes('cabin') || text.includes('service')) return { bg: C.infoSoft, border: `${C.info}33`, fg: C.textMute };
  return { bg: C.neutralSoft, border: `${C.neutral}33`, fg: C.textMute };
}

function relevanceColor(value) {
  return {
    low: C.neutral,
    moderate: C.info,
    potential: C.amber,
    high_concern: C.red,
    unknown: C.textDim,
  }[value] || C.amber;
}

function signalTitle(value) {
  return String(value || 'none_found').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function recordTitle(record) {
  if (record.ata_code === '7500') return 'Engine Bleed Air';
  if (record.ata_code === '5220') return 'Passenger Door';
  if (record.ata_code === '3350' || record.ata_code === '3397') return 'Emergency Lighting';
  if (record.ata_code === '2530') return 'Galley Oven';
  if (record.ata_code === '3240') return 'Wheels & Brakes';
  return record.system_category || record.ata_category || record.component || 'Service Difficulty Report';
}

function filterSdrRecords(records, active) {
  if (active === 'all') return records;
  return records.filter((r) => {
    const flags = r.event_flags || [];
    const category = r.system_category || '';
    if (active === 'routine') return r.safety_relevance === 'low' || r.severity_band === 'routine';
    if (active === 'potential') return ['potential', 'high_concern'].includes(r.safety_relevance);
    if (active === 'notable') return flags.some((f) => ['rejected_takeoff', 'fire_or_overheat_indication', 'smoke_or_fumes', 'crack_or_structural_damage', 'brake_or_directional_control'].includes(f));
    if (active === 'repeated') return flags.includes('repeat_category_member');
    if (active === 'engine') return category === 'Engine / pneumatic';
    if (active === 'doors') return category === 'Doors / structure';
    if (active === 'emergency') return category === 'Emergency equipment';
    if (active === 'brakes') return category === 'Landing gear / brakes';
    if (active === 'cabin') return category === 'Cabin / service';
    return true;
  });
}

function buildFallbackSummary(aircraft) {
  const sdr = aircraft.records.sdr || [];
  const ntsb = aircraft.records.ntsb || [];
  return {
    public_record_signal: sdr.length || ntsb.length ? 'moderate' : 'none_found',
    public_record_activity: sdr.length || ntsb.length ? 'Moderate' : 'None found',
    profile_read: aircraft.demo_scenario || 'Public-record profile',
    profile_summary_label: aircraft.demo_scenario || 'Public-record profile',
    most_notable_factor: sdr.length ? `${sdr.length} SDR public records` : 'No NTSB or SDR records found',
    ntsb_records_found: ntsb.length,
    sdr_records_found: sdr.length,
    safety_relevance_breakdown: {},
    severity_band_breakdown: {},
    system_breakdown: {},
    repeated_category_patterns: [],
    notable_events: [],
    disclaimer: 'Public records only — not a complete maintenance history or FAA airworthiness determination.',
  };
}

// ─────────────────────────────────────────────────────────────
// Registration status — colored value
// ─────────────────────────────────────────────────────────────
function RegistrationStatusValue({ status }) {
  const s = (status || '').toLowerCase();
  const color = s.includes('deregister') || s.includes('cancel') || s.includes('expir')
    ? C.amber : C.green;
  return (
    <span style={{ color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: color }} />
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function groupBy(arr, keyFn) {
  return arr.reduce((acc, x) => {
    const k = keyFn(x);
    if (!acc[k]) acc[k] = [];
    acc[k].push(x);
    return acc;
  }, {});
}
