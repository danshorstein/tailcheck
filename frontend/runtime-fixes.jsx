// TailCheck — runtime polish for static-profile edge cases
// Loaded after profile.jsx and before app.jsx.

function isBlankProfileValue(value) {
  return value == null || value === '' || String(value).toLowerCase() === 'undefined' || String(value).toLowerCase() === 'null';
}

function patchAircraftProfile(aircraft) {
  if (!aircraft) return aircraft;

  // Avoid visible strings like "undefined" in the hero subtitle for aircraft
  // where the FAA registry extract does not include a manufacture year.
  if (aircraft.identity && isBlankProfileValue(aircraft.identity.year_mfr)) {
    aircraft.identity.year_mfr = 'Year unknown';
  }

  // Static SDR records did not originally carry a source object, which meant
  // the record drawer could not show the source/open affordance consistently.
  if (aircraft.records && Array.isArray(aircraft.records.sdr)) {
    aircraft.records.sdr = aircraft.records.sdr.map((record) => ({
      ...record,
      source: record.source || { key: 'faa_sdr', accessed_at: aircraft.snapshot_generated_at },
    }));
  }

  return aircraft;
}
window.patchAircraftProfile = patchAircraftProfile;

if (window.DEMO_PACK && Array.isArray(window.DEMO_PACK.aircraft)) {
  window.DEMO_PACK.aircraft = window.DEMO_PACK.aircraft.map(patchAircraftProfile);
}

if (window.getAircraftByNNumber) {
  const originalGetAircraftByNNumber = window.getAircraftByNNumber;
  window.getAircraftByNNumber = function patchedGetAircraftByNNumber(input) {
    return patchAircraftProfile(originalGetAircraftByNNumber(input));
  };
}

if (window.lookupStaticAircraft) {
  const originalLookupStaticAircraft = window.lookupStaticAircraft;
  window.lookupStaticAircraft = async function patchedLookupStaticAircraft(input) {
    const result = await originalLookupStaticAircraft(input);
    if (result && result.aircraft) patchAircraftProfile(result.aircraft);
    return result;
  };
}

// The relevance breakdown is SDR-only. Hide it for NTSB-only profiles so a
// profile with one or more NTSB records does not misleadingly show a big all-zero
// "public-record breakdown" card.
function PublicRecordBreakdown({ summary }) {
  const sdrCount = summary.sdr_records_found || 0;
  if (!sdrCount) return null;

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
      <BlockHeader title="SDR relevance breakdown" count={sdrCount} source="FAA SDR" />
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
window.PublicRecordBreakdown = PublicRecordBreakdown;
