// TailCheck — bottom-sheet drawers (record detail, raw records)
// Loaded as <script type="text/babel">

const { useEffect: useEffectD, useState: useStateD } = React;

// ─────────────────────────────────────────────────────────────
// Drawer shell — slides up from the bottom of the device frame
// ─────────────────────────────────────────────────────────────
function Drawer({ open, onClose, title, subtitle, children }) {
  const [mounted, setMounted] = useStateD(false);
  useEffectD(() => {
    if (open) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 70,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'relative',
        background: C.bg,
        borderTop: `1px solid ${C.borderStrong}`,
        borderTopLeftRadius: 18, borderTopRightRadius: 18,
        maxHeight: '88%',
        transform: mounted ? 'translateY(0)' : 'translateY(40px)',
        opacity: mounted ? 1 : 0,
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -12px 30px rgba(0,0,0,0.4)',
      }}>
        {/* Handle */}
        <div style={{
          padding: '10px 0 6px', display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 99, background: C.borderStrong,
          }} />
        </div>
        {/* Header */}
        <div style={{
          padding: '4px 18px 12px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {subtitle && (
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: C.textDim,
                letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
              }}>{subtitle}</div>
            )}
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 500,
              color: C.text, letterSpacing: -0.2,
            }}>{title}</div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 99,
            background: C.surface, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
            <Icon name="close" size={13} color={C.textMute} />
          </button>
        </div>
        {/* Body */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '14px 18px 28px',
        }}>{children}</div>
      </div>
    </div>
  );
}
window.Drawer = Drawer;

// ─────────────────────────────────────────────────────────────
// RecordDetailDrawer — generic record detail (NTSB / SDR / AIDS)
// ─────────────────────────────────────────────────────────────
function RecordDetailDrawer({ open, onClose, kind, record }) {
  if (!record) return <Drawer open={open} onClose={onClose} />;
  const fields = buildFieldList(kind, record);
  const source = record.source ? window.getSourceMeta(record.source.key) : null;

  const titles = {
    ntsb: 'NTSB accident record',
    sdr:  'FAA Service Difficulty Report',
    aids: 'FAA AIDS incident',
  };
  const dateLabel = kind === 'sdr' ? record.report_date : record.event_date;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      subtitle={titles[kind] || 'Record'}
      title={`${window.formatDate(dateLabel)} · ${kind === 'sdr' ? `ATA ${record.ata_code}` : (record.location || '—')}`}
    >
      {/* Source provenance */}
      {source && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '10px 12px', marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <SourceBadge sourceKey={record.source.key} accessed={record.source.accessed_at} />
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 12, color: C.textMute,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{source.name}</span>
          </div>
          <button style={{
            background: 'transparent', border: 'none', padding: 4,
            display: 'flex', alignItems: 'center', gap: 4,
            color: C.textMute, cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase',
          }}>
            Open <Icon name="external" size={11} color={C.textMute} />
          </button>
        </div>
      )}

      {/* Narrative blocks (long-form) */}
      {fields.narratives.map((n, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: C.textDim,
            letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
          }}>{n.label}</div>
          <p style={{
            margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13.5,
            lineHeight: 1.55, color: C.text, textWrap: 'pretty',
          }}>{n.value}</p>
        </div>
      ))}

      {/* Structured fields */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '0 12px', marginBottom: 14,
      }}>
        {fields.rows.map((row, i, arr) => (
          <KV key={i} k={row.k} v={row.v} mono={row.mono !== false} last={i === arr.length - 1} />
        ))}
      </div>

      {/* Limitation note */}
      <div style={{
        background: C.bgDeep, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 12,
        display: 'flex', gap: 9,
      }}>
        <Icon name="info" size={13} color={C.textMute} />
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 11.5, lineHeight: 1.5,
          color: C.textMute, textWrap: 'pretty',
        }}>
          {kind === 'ntsb' &&
            'Public NTSB records summarize the investigation; refer to the official NTSB docket for the full report.'}
          {kind === 'sdr' &&
            'Service Difficulty Reports are submitted by operators and repair stations. They are not a complete maintenance history.'}
          {kind === 'aids' &&
            'AIDS incident records may be revised; operator names are often suppressed in public extracts.'}
        </span>
      </div>
    </Drawer>
  );
}
window.RecordDetailDrawer = RecordDetailDrawer;

// Build a tidy field list for each record type
function buildFieldList(kind, r) {
  if (kind === 'ntsb') {
    return {
      narratives: [
        r.probable_cause && { label: 'Probable cause', value: r.probable_cause },
        r.narrative_summary && { label: 'Narrative summary', value: r.narrative_summary },
      ].filter(Boolean),
      rows: [
        { k: 'Event ID',    v: r.event_id },
        { k: 'Date',        v: window.formatDate(r.event_date) },
        { k: 'Event type',  v: r.event_type, mono: false },
        { k: 'Location',    v: r.location, mono: false },
        { k: 'Phase',       v: r.phase_of_flight, mono: false },
        { k: 'Injury',      v: r.injury_severity },
        { k: 'Damage',      v: r.aircraft_damage },
        { k: 'Investigation', v: r.investigation_status },
        { k: 'Match basis', v: r.match_basis },
      ],
    };
  }
  if (kind === 'sdr') {
    return {
      narratives: [
        r.narrative_summary && { label: 'Narrative summary', value: r.narrative_summary },
      ].filter(Boolean),
      rows: [
        { k: 'Report ID',     v: r.report_id },
        { k: 'Report date',   v: window.formatDate(r.report_date) },
        { k: 'Manufacturer',  v: r.manufacturer },
        { k: 'Model',         v: r.model },
        { k: 'ATA code',      v: r.ata_code },
        { k: 'Category',      v: r.ata_category, mono: false },
        { k: 'Component',     v: r.component, mono: false },
        { k: 'Problem',       v: r.problem, mono: false },
        { k: 'Criticality',   v: `${r.criticality_guess} (heuristic)` },
        { k: 'Match basis',   v: r.match_basis },
      ],
    };
  }
  if (kind === 'aids') {
    return {
      narratives: [
        r.narrative_summary && { label: 'Narrative summary', value: r.narrative_summary },
        r.findings_summary  && { label: 'Findings', value: r.findings_summary },
      ].filter(Boolean),
      rows: [
        { k: 'Report #',      v: r.report_number },
        { k: 'Date',          v: window.formatDate(r.event_date) },
        { k: 'Location',      v: r.location, mono: false },
        { k: 'Make',          v: r.aircraft_make },
        { k: 'Model',         v: r.aircraft_model },
        { k: 'Operator',      v: r.operator, mono: false },
        { k: 'Match basis',   v: r.match_basis },
      ],
    };
  }
  return { narratives: [], rows: [] };
}

// ─────────────────────────────────────────────────────────────
// RawRecordsDrawer — dumps the curated JSON for the aircraft
// ─────────────────────────────────────────────────────────────
function RawRecordsDrawer({ open, onClose, aircraft }) {
  if (!aircraft) return <Drawer open={open} onClose={onClose} />;
  const json = JSON.stringify(aircraft, null, 2);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      subtitle="Raw curated record"
      title={`${aircraft.display_n_number} — JSON`}
    >
      <div style={{
        background: C.bgDeep, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 12, marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 9,
      }}>
        <Icon name="info" size={13} color={C.textMute} />
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 11.5, lineHeight: 1.5,
          color: C.textMute,
        }}>
          What you see in the UI is rendered from this static JSON. In production
          this would be assembled from FAA, NTSB, and SDR ingestions.
        </span>
      </div>
      <pre style={{
        margin: 0, padding: 14,
        background: C.bgDeep, border: `1px solid ${C.border}`,
        borderRadius: 10,
        fontFamily: 'var(--font-mono)', fontSize: 10.5, lineHeight: 1.55,
        color: C.text, whiteSpace: 'pre', overflow: 'auto',
        maxHeight: 460,
      }}>{json}</pre>
    </Drawer>
  );
}
window.RawRecordsDrawer = RawRecordsDrawer;
