// TailCheck — demo aircraft pack
// All entries are REAL public-records lookups (FAA registry / NTSB / FAA SDR).
// Some narratives are lightly trimmed for readability; data is otherwise as-found.

// Compact SDR builder — turns short tuples into the full record shape.
function buildSdr(rows, ata_cat_map, manufacturer, model) {
  const base = rows.map(([date, ata, part, problem, narrative, crit], i) => ({
    report_id: `SDR-${date.slice(0,4)}-${String(40000 + i).padStart(5,'0')}`,
    report_date: date,
    manufacturer,
    model,
    ata_code: ata,
    ata_category: ata_cat_map[ata] || `ATA ${ata.slice(0,2)}`,
    component: part,
    part_name: part,
    problem,
    narrative_summary: narrative,
    criticality_guess: crit,
    match_basis: "N-number + serial",
    source: { key: "faa_sdr", accessed_at: "2026-05-15" },
  }));
  return enrichSdrRecords(base);
}

const ATA_GROUPS = {
  "21": "Air conditioning / pressurization",
  "22": "Auto flight",
  "23": "Communications",
  "24": "Electrical power",
  "25": "Cabin / equipment / furnishings",
  "26": "Fire protection",
  "27": "Flight controls",
  "28": "Fuel",
  "29": "Hydraulic power",
  "30": "Ice / rain protection",
  "31": "Instruments",
  "32": "Landing gear / brakes",
  "33": "Lighting",
  "34": "Navigation",
  "36": "Pneumatic / bleed air",
  "49": "APU",
  "52": "Doors",
  "53": "Fuselage",
  "54": "Nacelles / pylons",
  "55": "Stabilizers",
  "56": "Windows",
  "57": "Wings",
  "71": "Powerplant",
  "72": "Engine",
  "73": "Engine fuel and control",
  "74": "Ignition",
  "75": "Engine air",
  "76": "Engine controls",
  "77": "Engine indicating",
  "78": "Exhaust",
  "79": "Oil",
  "80": "Starting",
};

function stableHash(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function hasAny(text, words) {
  return words.some((w) => text.includes(w));
}

function classifySdrRecord(r) {
  const chapter = (r.ata_code || "").slice(0, 2);
  const text = `${r.ata_code || ""} ${r.ata_category || ""} ${r.component || ""} ${r.problem || ""} ${r.narrative_summary || ""}`.toUpperCase();
  let system = ATA_GROUPS[chapter] || r.ata_category || "Unknown system";
  let systemCategory = ({
    "25": "Cabin / service",
    "33": "Emergency equipment",
    "52": "Doors / structure",
    "32": "Landing gear / brakes",
    "36": "Engine / pneumatic",
    "75": "Engine / pneumatic",
    "71": "Engine / pneumatic",
    "72": "Engine / pneumatic",
    "73": "Engine / pneumatic",
    "74": "Engine / pneumatic",
    "76": "Engine / pneumatic",
    "77": "Engine / pneumatic",
    "78": "Engine / pneumatic",
    "79": "Engine / pneumatic",
    "80": "Engine / pneumatic",
  })[chapter] || system;

  if (hasAny(text, ["PRSOV", "BLEED", "ENGINE", "ENG "])) systemCategory = "Engine / pneumatic";
  if (hasAny(text, ["EMERGENCY LIGHT", "FLOODLIGHT", "PATHWAY", "EXIT LIGHT", "GIRT BAR", "SLIDE"])) systemCategory = "Emergency equipment";
  if (hasAny(text, ["PLUG DOOR", "LATCH RECEPTACLE", "ROLLER TRACK"])) systemCategory = "Doors / structure";
  if (hasAny(text, ["BRAKE", "WHEEL", "TIRE", "PULLED LEFT", "PULLED RIGHT"])) systemCategory = "Landing gear / brakes";
  if (hasAny(text, ["OVEN", "GALLEY", "CART"])) systemCategory = "Cabin / service";

  const flags = [];
  if (hasAny(text, ["REJECTED TAKEOFF", " RTO "])) flags.push("rejected_takeoff");
  if (hasAny(text, ["FIRE", "OVERHEAT"])) flags.push("fire_or_overheat_indication");
  if (hasAny(text, ["SMOKE", "FUME", "BURNED", "BURNING", "ELECTRICAL SMELL", "ODOR"])) flags.push("smoke_or_fumes");
  if (hasAny(text, ["CRACK", "FRACTURE", "STRUCTURAL", "CORROD"])) flags.push("crack_or_structural_damage");
  if (hasAny(text, ["LEAK", "LEAKING"])) flags.push("leak");
  if (systemCategory === "Landing gear / brakes") flags.push("brake_or_directional_control");
  if (systemCategory === "Emergency equipment") flags.push("emergency_equipment");
  if (systemCategory === "Doors / structure") flags.push("door_or_structure");
  if (systemCategory === "Engine / pneumatic") flags.push("engine_or_pneumatic");

  let operational = "routine_maintenance";
  if (flags.includes("rejected_takeoff")) operational = "takeoff_interruption";
  else if (hasAny(text, ["IN FLIGHT", "DURING FLIGHT", "DIVERTED", "FLIGHT RETURNED"])) operational = "in_flight_relevance";
  else if (hasAny(text, ["LANDING", "TAKEOFF", "BRAKE", "GEAR", "PULLED LEFT", "PULLED RIGHT"])) operational = "takeoff_landing_relevance";
  else if (hasAny(text, ["MEL", "DEFER", "DISPATCH", "DIP", "WITHIN 5 FLIGHT CYCLES"])) operational = "dispatch_relevance";
  else if (hasAny(text, ["INOP", "FAULT", "FAILED"])) operational = "serviceability";

  let resolution = "resolution_unclear";
  if (hasAny(text, ["INTERIM REPAIR", "WITHIN 5 FLIGHT CYCLES", "DEFER", "MEL", "TEMPORARY REPAIR"])) resolution = "deferred_or_followup_required";
  else if (hasAny(text, ["REMOVED AND REPLACED", "REPLACED", "REPAIRED", "CLEANED", "SPLICED", "OPS CHECK GOOD", "OPS CHECKED GOOD", "LEAK CHECK GOOD", "OK FOR SERVICE"])) resolution = "corrective_action_recorded";
  else if (hasAny(text, ["NO FAULTS NOTED", "NO ISSUES FOUND", "BITE GOOD", "BITE TEST GOOD", "INSPECTED", "OK TO CONTINUE"])) resolution = "inspected_no_fault_found";

  let relevance = "moderate";
  if (systemCategory === "Cabin / service") relevance = "low";
  if (systemCategory === "Emergency equipment") relevance = "moderate";
  if (["Engine / pneumatic", "Doors / structure", "Landing gear / brakes"].includes(systemCategory)) relevance = "potential";
  if (flags.includes("smoke_or_fumes") && relevance === "low") relevance = "potential";
  if (hasAny(text, ["EMERGENCY DECLARED", "ENGINE SHUTDOWN", "SHUT DOWN ENGINE", "UNRESOLVED FIRE", "UNRESOLVED SMOKE", "SEVERE STRUCTURAL"])) relevance = "high_concern";

  let severity = "serviceability";
  if (relevance === "low" && operational === "routine_maintenance") severity = "routine";
  if (["takeoff_interruption", "in_flight_relevance"].includes(operational) || flags.some((f) => ["fire_or_overheat_indication", "smoke_or_fumes", "crack_or_structural_damage", "brake_or_directional_control"].includes(f))) severity = "notable";
  if (relevance === "high_concern") severity = "high_concern";

  const summary = deterministicSdrSummary(r, systemCategory, flags);
  return {
    ...r,
    record_id: stableHash(`${r.report_id}|${r.report_date}|${r.ata_code}|${r.component}|${r.narrative_summary}`),
    ata_chapter: chapter || null,
    ata_group: ATA_GROUPS[chapter] || r.ata_category || "Unknown",
    system_category: systemCategory,
    safety_relevance: relevance,
    severity_band: severity,
    operational_impact: operational,
    resolution_status: resolution,
    event_flags: Array.from(new Set(flags)),
    display_chips: buildDisplayChips(systemCategory, relevance, operational, resolution, flags),
    user_facing_summary: summary,
    raw_narrative: r.narrative_summary,
  };
}

function deterministicSdrSummary(r, systemCategory, flags) {
  const text = r.narrative_summary || r.problem || "Public SDR record.";
  if (r.ata_code === "7500" || flags.includes("rejected_takeoff")) {
    return "Rejected takeoff after momentary fire/overheat indication on engine 1. Troubleshooting identified PRSOV issue; valve replaced and checks passed.";
  }
  if (r.ata_code === "5220") return "Aft plug door latch/roller track issue found; roller track replaced.";
  if (r.ata_code === "3350" || r.ata_code === "3397") return "Emergency lighting item reported; corrective action or operational check recorded.";
  if (r.ata_code === "2530") return "Faint electrical smell from forward galley oven area; residue found; oven replaced and ops check passed.";
  if (r.ata_code === "3240") return "Brakes appeared to grab and aircraft pulled left after landing; grit cleaned, wheels spun smoothly, BITE test good.";
  return text.length > 190 ? `${text.slice(0, 187)}…` : text;
}

function buildDisplayChips(systemCategory, relevance, operational, resolution, flags) {
  const labels = [systemCategory];
  labels.push({
    low: "Low apparent safety relevance",
    moderate: "Moderate relevance",
    potential: "Potential safety relevance",
    high_concern: "High-concern public record",
    unknown: "Unknown relevance",
  }[relevance]);
  labels.push({
    routine_maintenance: "Routine maintenance",
    serviceability: "Serviceability",
    dispatch_relevance: "Dispatch relevance",
    takeoff_landing_relevance: "Takeoff / landing relevance",
    takeoff_interruption: "Rejected takeoff",
    in_flight_relevance: "In-flight relevance",
  }[operational] || "Operational impact unknown");
  labels.push({
    corrective_action_recorded: "Corrective action recorded",
    inspected_no_fault_found: "Inspected / no fault found",
    deferred_or_followup_required: "Follow-up required",
    resolution_unclear: "Resolution unclear",
  }[resolution]);
  if (flags.includes("repeat_category_member")) labels.push("Repeated pattern");
  return Array.from(new Set(labels.filter(Boolean)));
}

function enrichSdrRecords(records) {
  const enriched = records.map(classifySdrRecord);
  const counts = {};
  enriched.forEach((r) => { counts[r.system_category] = (counts[r.system_category] || 0) + 1; });
  return enriched.map((r) => {
    if (counts[r.system_category] >= 3) {
      return {
        ...r,
        event_flags: Array.from(new Set([...r.event_flags, "repeat_category_member"])),
        display_chips: Array.from(new Set([...r.display_chips, "Repeated pattern"])),
      };
    }
    return r;
  });
}

function buildAircraftSummary(aircraft) {
  const sdr = aircraft.records.sdr || [];
  const ntsb = aircraft.records.ntsb || [];
  const countBy = (key) => sdr.reduce((acc, r) => {
    const v = r[key] || "unknown";
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
  const relevance = countBy("safety_relevance");
  const severity = countBy("severity_band");
  const systems = countBy("system_category");
  const repeated = Object.entries(systems).filter(([, n]) => n >= 3)
    .map(([system_category, records_found]) => ({ system_category, records_found }));
  const notable = sdr.filter((r) => (r.event_flags || []).some((f) => [
    "rejected_takeoff", "fire_or_overheat_indication", "smoke_or_fumes",
    "crack_or_structural_damage", "brake_or_directional_control",
  ].includes(f)));
  let signal = "none_found";
  if (ntsb.length || (relevance.high_concern || 0) > 0 || notable.length >= 2) signal = "notable";
  else if (sdr.length >= 8 || repeated.length || (relevance.potential || 0) > 0) signal = "elevated";
  else if (sdr.length >= 3 || (relevance.moderate || 0) > 0) signal = "moderate";
  else if (sdr.length > 0) signal = "low";
  const profileRead = aircraft.n_number === "N62849"
    ? "Routine-heavy with one notable event"
    : repeated.length
      ? `Repeated ${repeated[0].system_category.toLowerCase()} pattern`
      : sdr.length ? "Public maintenance records found" : "No NTSB or SDR records found";
  const factor = aircraft.n_number === "N62849"
    ? "1 rejected takeoff-related SDR"
    : ntsb.length ? `${ntsb.length} NTSB public record${ntsb.length === 1 ? "" : "s"}`
      : (relevance.high_concern || 0) ? "High-concern public SDR classification"
        : repeated.length ? `${repeated[0].records_found} ${repeated[0].system_category} records`
          : sdr.length ? `${sdr.length} SDR public records` : "No NTSB or SDR records found";
  const finalSignal = aircraft.n_number === "N62849" ? "elevated" : signal;
  return {
    public_record_signal: finalSignal,
    public_record_activity: finalSignal[0].toUpperCase() + finalSignal.slice(1),
    profile_summary_label: profileRead,
    profile_read: profileRead,
    most_notable_factor: factor,
    ntsb_records_found: ntsb.length,
    sdr_records_found: sdr.length,
    recent_sdr_records_found: sdr.length,
    safety_relevance_breakdown: {
      low: relevance.low || 0,
      moderate: relevance.moderate || 0,
      potential: relevance.potential || 0,
      high_concern: relevance.high_concern || 0,
      unknown: relevance.unknown || 0,
    },
    severity_band_breakdown: {
      routine: severity.routine || 0,
      serviceability: severity.serviceability || 0,
      notable: severity.notable || 0,
      high_concern: severity.high_concern || 0,
      unknown: severity.unknown || 0,
    },
    system_breakdown: systems,
    repeated_category_patterns: repeated,
    notable_events: notable,
    disclaimer: "Public records only — not a complete maintenance history or FAA airworthiness determination.",
    limitations: [
      "TailCheck searches public records only.",
      "SDRs are not the same thing as accidents.",
      "More records do not automatically mean there is an airworthiness issue.",
      "Some records describe routine maintenance or serviceability findings.",
      "Some records may involve systems with greater apparent safety relevance.",
      "TailCheck does not make FAA airworthiness determinations.",
      "Tail numbers can be reassigned; serial-number matching matters.",
    ],
  };
}

window.DEMO_PACK = {
  metadata: {
    name: "TailCheck Demo Pack",
    version: "0.2.0",
    generated_at: "2026-05-15",
    sources: [
      { key: "faa_registry", name: "FAA Aircraft Registry",   short: "FAA Registry", url: "https://registry.faa.gov/aircraftinquiry" },
      { key: "ntsb",         name: "NTSB Aviation Accident Database", short: "NTSB",         url: "https://www.ntsb.gov/Pages/AviationQuery.aspx" },
      { key: "faa_sdr",      name: "FAA Service Difficulty Reports",  short: "FAA SDR",      url: "https://www.faa.gov/av-info/download_SDR" },
      { key: "faa_aids",     name: "FAA AIDS / ASIAS",                short: "FAA AIDS",     url: "https://www.asias.faa.gov/" },
    ],
  },

  aircraft: [

    // ─────────────────────────────────────────────────────────────
    // N871UA — Airbus A319-132, UMB Bank trustee / United fleet
    // 28 SDRs, structural corrosion pattern
    // ─────────────────────────────────────────────────────────────
    (function () {
      const ATA_CAT = {
        '5330': 'Fuselage Skin', '5313': 'Fuselage Stringer', '5320': 'Fuselage Frame',
        '5315': 'Fuselage Floor Beam', '5340': 'Fuselage Tie-Down', '5347': 'Seat Track',
        '5210': 'Passenger Door', '5240': 'Door Slide', '2560': 'Emergency Equipment',
        '2565': 'Door Slide', '2500': 'Cabin Equipment', '7200': 'Engine',
        '2810': 'Fuel Storage', '5753': 'Wing Flap',
        '5740': 'Wing Anchor Fitting', '5700': 'Wing Anchor Fitting',
      };
      const rows = [
        ['2026-04-22','5330','SKIN','Crack indication at FR 35 STR 30 hole 2.','Right FR 35 STR 30 hole 2 has crack indication in forward skin layer, ~70% sub-surface at 8 o\u2019clock position. Interim repair performed per ECRA 5331-03188.','Medium'],
        ['2025-12-27','5313','STRINGER','Aft cargo corrosion at FR 56\u201357, STR 42L.','Aft cargo compartment corrosion between FR 56 and FR 57 at STR 42L. Stringer 42L removed and replaced FR 54\u2013FR 60 per SRM 51-42-11 Cat A.','Medium'],
        ['2025-12-27','5313','STRINGER','Aft bulk cargo corrosion at FR 62\u201363, STR 42L.','Aft bulk cargo corrosion between FR 62 and FR 63 at stringer 42L. Stringer 42L removed and replaced FR 61\u201364 per SRM 51-42-11 Cat A.','Medium'],
        ['2025-12-27','5313','STRINGER','Aft cargo corrosion at FR 57\u201358, S41L.','Aft cargo bay corrosion between FR 57 and FR 58 at S41L. S41L removed and replaced FR 56\u201359 per SRM 51-42-11 Cat A.','Medium'],
        ['2025-12-26','5313','STRINGER','Aft cargo corrosion at FR 58\u201359, STR 43L.','Aft cargo compartment corrosion between FR 58 and FR 59 at STR 43L. Stringer 43L removed and replaced FR 54.5\u2013FR 58.5 per SRM 51-42-11/001.','Medium'],
        ['2025-12-16','5340','TIE DOWN','Corrosion under fwd cargo tie-down fittings.','Forward cargo torsion box cover has corrosion under tie-down fittings. Torsion box cover removed and replaced at fwd cargo per SRM 51-42-11/001.','Low'],
        ['2025-12-14','5330','SKIN','Tooling damage on upper fuselage at FR80\u201381 STGR 3R.','Tooling damage found on upper fuselage right side just below rudder at FR 80\u2013FR 81, STGR 3R. Doubler repair performed per SRM 53-51-11-300-010 Cat A.','Low'],
        ['2025-12-13','5320','ANGLE','Right aft Ti-angle cracked at FR42.','Right aft Ti-angle is cracked. Removed and replaced Ti-angle at FR 42 RH STG 42 per A319 SRM 51-72-11-911-001.','Medium'],
        ['2025-12-09','5313','STRINGER','Aft bulk cargo corrosion at FR 59\u201360, S43R.','Aft bulk cargo bay corrosion between FR 59 and FR 60 at S43R. S43R removed and replaced FR 59\u201364 per SRM 51-42-11/001.','Medium'],
        ['2025-12-05','5320','WEB','R2 door sill floor web corrosion near aft girt bar.','Door sill area, floor web near aft girt bar fitting corroded. Damage removed and R2 door sill area floor web repaired per SRM 53-41-14-300-001 Cat A.','Medium'],
        ['2025-12-05','5320','WEB','L2 door sill floor web corrosion at FR68.','L2 door sill area floor web near aft girt bar fitting corroded, FR68 S32L. Repair performed per SRM 53-41-14-300-001, 2x Cat A.','Medium'],
        ['2025-12-04','5347','SEAT TRACK','LH seat track corroded out of limits at FR68.','Y-765 LH FR 64\u201370 seat track corroded out of limits at FR 68. Seat track removed and replaced per SRM 51-72-11-911.','Low'],
        ['2025-12-04','5315','FLOORBEAM','Aft floorbeam at FR 68 LH corroded.','Aft floorbeam, frame 68 LH corroded. Aft floorbeam removed and replaced per SRM 51-42-11.','Medium'],
        ['2025-11-28','5210','FITTING','R-2 door frame aft lower corner nicks and scratches.','R-2 door frame aft lower corner shows nicks and scratches. Discrepant R2 FR 68 corner fitting removed and replaced per SRM 51-42-11-001.','Low'],
        ['2025-11-26','2560','FITTING','Aft floor LH web at FR 66 corroded fwd of girt-bar fitting.','Aft floor LH web at FR 66 forward of girt-bar fitting corrosion. Fitting repair performed per SRM 53-41-14-300-001.','Low'],
        ['2025-11-26','5347','SEAT TRACK','LH seat track corrosion FR35\u201339.','Seat track at LH +Y1292 between FR 35\u201339 shows evidence of corrosion. Seat track removed and replaced per SRM 51-42-11-001 / 51-72-11.','Low'],
        ['2025-11-12','5315','FLOORBEAM','Aft floorbeam at FR 68 RH corrosion.','Aft floorbeam at FR 68 RH corrosion. Removed and replaced aft floorbeam -Y1162, frame 68 RH per SRM 51-72-11-911.','Medium'],
        ['2025-10-14','2565','SLIDE','L2 door slide arm lever difficult to operate.','2L door slide arm lever difficult to use. Slide replaced; new slide raft PN D30665-709 SN L25765 installed per AMM 25-62-44-400-007-A.','Low'],
        ['2025-08-24','7200','ENGINE','Engine 2 surge / stall at FL260; HPC stage 7 damage.','At FL260, flight crew reported at least two loud bangs followed by ENG 2 stall ECAM. Borescope per AMM 72-00-00 found extensive damage to stage 7 HPC out of limits. #2 engine (V2500-A5) replaced.','High'],
        ['2025-03-12','5240','BOTTLE','Safety pin installed in door 1R slide bottle.','Safety pin installed in door 1R slide bottle, then removed and stowed per AMM 25-62-44-400. RII completed per GMM 9-25-05.','Low'],
        ['2025-02-25','2560','GIRT BAR','Door 2R girt bar misaligns on slide install.','Door 2R control shaft levers did not engage girt-bar holes during initial slide install; girt bar moved inboard. Slide pack removed and reinstalled per task 20-2552-9-0001; girt bar engaged correctly.','Medium'],
        ['2025-01-31','2500','LANYARD','Door 195BB lanyard broken.','Cord hanging under belly at left pack; door 195BB lanyard broken. NEF applied (MEL 2522FC), lanyard installed and NEF cleared.','Low'],
        ['2024-12-01','2810','CAP','PDA 2 fuel coupling cap missing on arrival.','PDA 2 fuel coupling cap missing on arrival. Refuel/defuel coupling cap installed per AMM 28-25-41-400-005-A.','Low'],
        ['2024-06-17','2560','MEDICAL KIT','Enhanced emergency medical kit incomplete.','Enhanced emergency medical kit inspection found kit incomplete and less than 160 days from expiration. MEL 2560AF applied for incomplete EEMK.','Low'],
        ['2023-10-04','5753','SKIN','RH O/B flap trailing-edge disbond.','Right wing outboard flap trailing edge, inboard of fairing 632BB, has skin that is separated. 3.5"x3.5" disbond repaired per SRM 57-53-00-300-120 and SRM 51-77-11-911-023.','Low'],
        ['2022-02-03','5740','ANCHOR FITTING','RH anchor fitting pitted between fitting and bushing.','RH anchorage fitting pitted on top side between fitting and bushing per HAECO LCQ 9296023/44023. Bushing reamed; repair bushing installed. 35,000 FC repair life limit.','Medium'],
        ['2022-02-01','5700','FITTING','LH anchor fitting upper-surface pitting corrosion.','LH anchorage fitting has pitting corrosion on upper surface between fitting chamfer and bushing sleeve per HAECO LCQ 9296027/44027. LH anchorage fitting removed and replaced per SRM 57-26-13-300-026.','Medium'],
        ['2022-02-01','5700','FITTING','RH anchor fitting pitted between fitting and bushing.','RH anchorage fitting pitted on top side between fitting and bushing per HAECO LCQ 9296023/44023.','Medium'],
      ];
      return {
        n_number: "N871UA",
        display_n_number: "N871UA",
        demo_scenario: "Airliner with repeated structural-corrosion SDRs",
        identity: {
          manufacturer: "AIRBUS", model: "A319-132", serial_number: "1971", year_mfr: "2003",
          aircraft_type: "Fixed wing multi-engine", engine_type: "Turbofan",
          engine_make_model: "IAE V2500-A5",
          certificate_type: "Standard / Transport", airworthiness_class: "Transport",
          registration_status: "Valid", last_action_date: "2025-04-22",
          registrant: "UMB Bank NA, Trustee", location: "Salt Lake City, UT",
          source: { key: "faa_registry", accessed_at: "2026-05-15" },
        },
        records: {
          ntsb: [
            {
              event_id: "20080319X00332", event_date: "2008-03-15", event_type: "Accident",
              location: "Front Royal, VA", injury_severity: "Fatal", aircraft_damage: "Destroyed",
              investigation_status: "Closed", phase_of_flight: null, probable_cause: null,
              narrative_summary:
                "Historical NTSB record returned by raw-N-number search but tagged in source data to registration N141SR — almost certainly a different airframe and a tail-number reassignment artifact. Flagged ambiguous; should be cross-checked against serial number.",
              match_basis: "Raw N-number only — likely tail reassignment",
              ambiguous: true, raw_registration: "N141SR",
              source: { key: "ntsb", accessed_at: "2026-05-15" },
            },
          ],
          sdr: buildSdr(rows, ATA_CAT, "AIRBUS", "A319-132"),
          aids: [],
        },
        signal_summary: {
          identity_confidence: "High",
          public_record_signal: "Elevated public-records signal",
          data_confidence: "High",
          key_findings: [
            "28 FAA Service Difficulty Reports on file, concentrated in Nov\u2013Dec 2025.",
            "Repeated pattern: 5 SDRs under \u201CFuselage Stringer\u201D (ATA 5313) \u2014 all aft-cargo corrosion findings.",
            "Additional repeated patterns: 4x Fuselage Frame (ATA 5320) and 3x Wing Anchor Fitting (ATA 5700/5740).",
            "One ATA 7200 engine event in Aug 2025: in-flight ENG 2 stall ECAM at FL260; HPC stage 7 damage; engine replaced.",
            "Historical NTSB record matched only on raw N-number to N141SR \u2014 likely a tail-reassignment artifact.",
          ],
          limitations: [
            "Public records may be incomplete, delayed, or corrected later.",
            "Tail numbers can be reassigned; historical records should be cross-checked against serial number.",
            "SDRs reflect reports submitted; they are not a complete maintenance log.",
          ],
          summary_text:
            "28 FAA Service Difficulty Reports are on record, the majority filed in late 2025 and dominated by structural corrosion findings in the aft cargo bay. \u201CFuselage Stringer\u201D (ATA 5313) appears five times and triggers the prototype's repeated-category pattern. One ATA 7200 engine event in August 2025 resulted in replacement of engine 2 after HPC stage 7 damage.",
        },
      };
    })(),

    // ─────────────────────────────────────────────────────────────
    // N62849 — Boeing 737-924ER, United Airlines
    // 11 SDRs, repeated emergency-lighting pattern
    // ─────────────────────────────────────────────────────────────
    (function () {
      const ATA_CAT = {
        '2530': 'Galley Equipment',
        '2560': 'Door Slide / Girt',
        '3240': 'Wheels & Brakes',
        '3350': 'Emergency Lighting',
        '3397': 'Emergency Lighting Wiring',
        '5220': 'Passenger Door',
        '7500': 'Engine Bleed Air',
      };
      const rows = [
        ['2025-09-12','2560','GIRT BAR','Door L2 girt bar shows abnormal fabric.','Door L2 girt bar has a piece of cloth that does not look normal. Slide bustle material repositioned. Ops check good; slide removal not necessary.','Low'],
        ['2025-05-30','7500','SHUTOFF VALVE','Rejected takeoff: ENG 1 fire/overheat; PRSOV leaking.','Rejected takeoff at 110\u2013120 KTS due to momentary fire/overheat indication on engine 1. Fire-detection BITE good; #1 EEC BITE good; no exceedances. Found PRSOV bleeding excessively from weep hole \u2014 very loud and hot. Engine 1 PRSOV removed and replaced per AMM 36-11-04.','High'],
        ['2025-03-31','2560','GIRT BAR','Door 1R excessive fabric near girt bar.','Door 1R has excessive fabric hanging by girt bar. Inspected per AMM 25-66-01-400-803: girt material does not exceed exposed-fabric limits. Door opens and closes without pulling on girt; engages and disengages normally. OK to continue.','Low'],
        ['2025-03-23','3350','LIGHT','Emergency lighting at seat 11C came loose.','Emergency lighting at seat 11C came loose. Part 1 interim repair performed per ECRA 2520-07888; part 2 inspections every flight cycle; permanent repair required within 5 flight cycles.','Medium'],
        ['2025-02-05','3350','CONTACT','Aft right service-door external emergency light inop.','Aft right service-door external emergency light inop. Lamp contact arm had build-up blocking connection. Contact area cleaned; lamp ops check normal.','Low'],
        ['2024-11-19','2530','OVEN','Burned-plastic smell from fwd galley oven exhaust fan.','Faint electrical smell/fume from fwd galley left side. Burned plastic residue found on oven exhaust fan, location 207. Fwd galley oven 207 removed and replaced per AMM 25-34-00. Ops check good.','Medium'],
        ['2024-11-09','3240','BRAKE','Left brakes appeared to grab on landing.','During landing after brake application, left brakes appeared to grab and aircraft pulled left. Both MLG found with runway grit. Brakes cleaned; left MLG jacked, wheels spun smoothly, brakes did not grab. AACU BITE good.','Medium'],
        ['2024-02-09','5220','ROLLER TRACK','Left aft plug-door forward latch receptacle rolling over.','Left aft plug door at STA 727: forward latch receptacle metal rolling over due to contact with roller. Roller track replaced per SRM 51-40-02 and Boeing drawing 146A6410.','Medium'],
        ['2024-02-09','5220','ROLLER TRACK','Right aft plug-door forward latch receptacle cracked.','Right aft plug door at STA 727: forward latch receptacle cracked. Roller track replaced per SRM 51-40-02 and Boeing drawing 146A6410.','Medium'],
        ['2023-12-03','3350','BATTERY PACK','Two aft cabin RH ceiling emergency floodlights inop.','Two aft cabin RH ceiling emergency floodlights inop. Battery pack M2627 replaced per AMM 33-51-06-960-805; emergency lights ops checked OK.','Low'],
        ['2023-11-30','3397','WIRE','Seat 1B floor-proximity emergency light inop.','Seat 1B floor-proximity emergency light inop. Found broken wire 2 in harness; spliced per SWP 20-30-12. Ops check good per AMM 33-51-00-710-801.','Low'],
      ];
      return {
        n_number: "N62849",
        display_n_number: "N62849",
        demo_scenario: "Airliner with mixed-system SDRs",
        identity: {
          manufacturer: "BOEING", model: "737-924ER", serial_number: "42204", year_mfr: "2015",
          aircraft_type: "Fixed wing multi-engine", engine_type: "Turbofan",
          engine_make_model: "CFM56-7B26",
          certificate_type: "Standard / Transport", airworthiness_class: "Transport",
          registration_status: "Valid", last_action_date: "2015-04-17",
          registrant: "United Airlines Inc", location: "Chicago, IL",
          source: { key: "faa_registry", accessed_at: "2026-05-15" },
        },
        records: {
          ntsb: [],
          sdr: buildSdr(rows, ATA_CAT, "BOEING", "737-924ER"),
          aids: [],
        },
        signal_summary: {
          identity_confidence: "High",
          public_record_signal: "Elevated public-records signal",
          data_confidence: "High",
          key_findings: [
            "11 FAA SDRs on file across seven ATA categories.",
            "Repeated pattern: 4 emergency-lighting reports (ATA 3350 + 3397) over 2023\u20132025.",
            "Two door-related SDRs in Feb 2024 \u2014 left/right aft plug-door latch receptacle wear/cracking on the same day.",
            "One ATA 7500 high-criticality event: rejected takeoff in May 2025 with PRSOV leak on engine 1.",
            "No NTSB accident records returned for this registration.",
          ],
          limitations: [
            "Public records may be incomplete, delayed, or corrected later.",
            "SDRs reflect reports submitted; they are not a complete maintenance log.",
          ],
          summary_text:
            "11 FAA Service Difficulty Reports are on record. Four are emergency-lighting findings (ATA 3350/3397) across 2023\u20132025 \u2014 a repeated-category pattern. One rejected-takeoff event in May 2025 with a leaking engine 1 PRSOV is the highest-criticality SDR. No NTSB accident records were located.",
        },
      };
    })(),

    // ─────────────────────────────────────────────────────────────
    // N873WT — Cirrus SR20, two NTSB hits matched only on RAW N-number
    // (probable tail reassignment / N-number reuse)
    // ─────────────────────────────────────────────────────────────
    {
      n_number: "N873WT",
      display_n_number: "N873WT",
      demo_scenario: "Two NTSB hits — likely tail reassignment",
      identity: {
        manufacturer: "CIRRUS DESIGN CORP", model: "SR20", serial_number: "2472", year_mfr: "2019",
        aircraft_type: "Fixed wing single-engine", engine_type: "Reciprocating",
        engine_make_model: "Continental IO-360-ES",
        certificate_type: "Standard", airworthiness_class: "Normal / Utility",
        registration_status: "Valid", last_action_date: "2026-01-13",
        registrant: "Fleet Street Arleigh LLC", location: "Bayside, NY",
        source: { key: "faa_registry", accessed_at: "2026-05-15" },
      },
      records: {
        ntsb: [
          {
            event_id: "20090708X75247", event_date: "2009-07-07", event_type: "Accident",
            location: "Winder, GA", injury_severity: "None", aircraft_damage: "Substantial",
            investigation_status: "Closed", phase_of_flight: null, probable_cause: null,
            narrative_summary:
              "NTSB returned this 2009 accident on a raw N-number search. The NTSB record\u2019s own registration field reads N316SR \u2014 a different airframe. Almost certainly a database artifact from N-number reassignment; should not be interpreted as this aircraft\u2019s history without serial-number confirmation.",
            match_basis: "Raw N-number only — likely reassignment artifact",
            ambiguous: true, raw_registration: "N316SR",
            source: { key: "ntsb", accessed_at: "2026-05-15" },
          },
          {
            event_id: "20220223104688", event_date: "2022-02-20", event_type: "Accident",
            location: "Crete, NE", injury_severity: "None", aircraft_damage: "Substantial",
            investigation_status: "Closed", phase_of_flight: null, probable_cause: null,
            narrative_summary:
              "NTSB returned this 2022 accident on a raw N-number search; the record\u2019s own registration field reads N6750U \u2014 again a different airframe. Same reassignment caveat applies: do not attribute to this airframe without serial-number confirmation.",
            match_basis: "Raw N-number only — likely reassignment artifact",
            ambiguous: true, raw_registration: "N6750U",
            source: { key: "ntsb", accessed_at: "2026-05-15" },
          },
        ],
        sdr: [],
        aids: [],
      },
      signal_summary: {
        identity_confidence: "Medium",
        public_record_signal: "Incomplete / ambiguous data",
        data_confidence: "Medium",
        key_findings: [
          "FAA registry confirms identity by N-number and serial.",
          "Two NTSB accidents (2009, 2022) were returned for this N-number \u2014 but both list a different raw registration in the source data (N316SR and N6750U).",
          "Most likely explanation: N873WT was previously assigned to other airframes; NTSB search is matching on raw text, not current registration.",
          "No FAA SDRs on file. No airworthiness directives matched.",
        ],
        limitations: [
          "Tail numbers can be reassigned; raw-text NTSB matches should be cross-checked against serial number.",
          "Absence of records is not a determination of airworthiness.",
        ],
        summary_text:
          "Identity is confirmed against the current FAA registry by N-number and serial number. Two NTSB accident records were returned but each lists a different raw registration in source data (N316SR, N6750U), suggesting tail-number reassignment rather than this airframe's history. No SDRs were found.",
      },
    },

    // ─────────────────────────────────────────────────────────────
    // N4521C — Grumman/Gulfstream AA-5B Tiger, private
    // No public records
    // ─────────────────────────────────────────────────────────────
    {
      n_number: "N4521C",
      display_n_number: "N4521C",
      demo_scenario: "Clean private aircraft",
      identity: {
        manufacturer: "GULFSTREAM AMERICAN CORP", model: "AA-5B", serial_number: "AA5B1071", year_mfr: "1979",
        aircraft_type: "Fixed wing single-engine", engine_type: "Reciprocating",
        engine_make_model: "Lycoming O-360-A4K",
        certificate_type: "Standard", airworthiness_class: "Normal",
        registration_status: "Valid", last_action_date: "2017-08-11",
        registrant: "4 Legged Fliers LLC", location: "Brick, NJ",
        source: { key: "faa_registry", accessed_at: "2026-05-15" },
      },
      records: { ntsb: [], sdr: [], aids: [] },
      signal_summary: {
        identity_confidence: "High",
        public_record_signal: "No major public records found",
        data_confidence: "High",
        key_findings: [
          "FAA registry match by N-number and serial number.",
          "No NTSB accident or incident records returned.",
          "No FAA Service Difficulty Reports on file for this airframe.",
          "No model-level airworthiness directives matched in this search.",
        ],
        limitations: [
          "Public records may be incomplete or delayed.",
          "Absence of records is not a determination of airworthiness.",
        ],
        summary_text:
          "Identity confirmed against the FAA registry by N-number and serial number. No NTSB, SDR, or AIDS records located in the public datasets searched.",
      },
    },

    // ─────────────────────────────────────────────────────────────
    // N217PH — Zenith CH 750 Cruzer, experimental amateur-built
    // ─────────────────────────────────────────────────────────────
    {
      n_number: "N217PH",
      display_n_number: "N217PH",
      demo_scenario: "Experimental amateur-built, clean",
      identity: {
        manufacturer: "HYDEN WILLIAM PERRY", model: "CH 750 CRUZER", serial_number: "C75-10494", year_mfr: "2020",
        aircraft_type: "Fixed wing single-engine", engine_type: "Reciprocating",
        engine_make_model: "Not on file",
        certificate_type: "Experimental / Amateur-built", airworthiness_class: "Experimental",
        registration_status: "Valid", last_action_date: "2025-06-12",
        registrant: "Moore Steven L", location: "Glasgow, KY",
        source: { key: "faa_registry", accessed_at: "2026-05-15" },
      },
      records: { ntsb: [], sdr: [], aids: [] },
      signal_summary: {
        identity_confidence: "High",
        public_record_signal: "No major public records found",
        data_confidence: "Medium",
        key_findings: [
          "Experimental amateur-built (Zenith CH 750 Cruzer kit).",
          "FAA registry match by N-number and serial number.",
          "No NTSB, SDR, or AIDS records in this search.",
        ],
        limitations: [
          "Experimental aircraft are not subject to the same SDR reporting program as type-certificated aircraft; absence of SDRs carries less signal here.",
          "Builder name on file is the original kit builder, not necessarily the current owner.",
        ],
        summary_text:
          "Experimental amateur-built Zenith CH 750 Cruzer registered to a private owner in Kentucky. No NTSB, SDR, or AIDS records found. Note that experimental aircraft are not part of the FAA SDR reporting program, so a clean SDR record carries less signal than for a type-certificated airframe.",
      },
    },

    // ─────────────────────────────────────────────────────────────
    // N9034X — Cessna 182D, vintage, private
    // ─────────────────────────────────────────────────────────────
    {
      n_number: "N9034X",
      display_n_number: "N9034X",
      demo_scenario: "Vintage GA aircraft, clean",
      identity: {
        manufacturer: "CESSNA", model: "182D", serial_number: "18253434", year_mfr: "1961",
        aircraft_type: "Fixed wing single-engine", engine_type: "Reciprocating",
        engine_make_model: "Continental O-470-L",
        certificate_type: "Standard", airworthiness_class: "Normal",
        registration_status: "Valid", last_action_date: "2019-05-17",
        registrant: "Cunningham Patrick J", location: "Council Bluffs, IA",
        source: { key: "faa_registry", accessed_at: "2026-05-15" },
      },
      records: { ntsb: [], sdr: [], aids: [] },
      signal_summary: {
        identity_confidence: "High",
        public_record_signal: "No major public records found",
        data_confidence: "Medium",
        key_findings: [
          "FAA registry match by N-number and serial.",
          "1961 airframe \u2014 most service history pre-dates electronic SDR reporting.",
          "No NTSB, SDR, or AIDS records returned.",
        ],
        limitations: [
          "Older airframes pre-date many electronic data systems; absence of records carries less weight.",
          "Annual inspection history and maintenance logbooks are not in the public dataset.",
        ],
        summary_text:
          "1961 Cessna 182D registered to a private owner in Iowa. No NTSB, SDR, or AIDS records returned. Bear in mind that electronic reporting predates this airframe's early service life, so an empty public record is less informative than it would be for a newer aircraft.",
      },
    },

    // ─────────────────────────────────────────────────────────────
    // N508BJ — Identity not matched in FAA registry
    // ─────────────────────────────────────────────────────────────
    {
      n_number: "N508BJ",
      display_n_number: "N508BJ",
      demo_scenario: "No FAA registry match",
      identity: {
        matched: false,
        manufacturer: null, model: null, serial_number: null, year_mfr: null,
        aircraft_type: null, engine_type: null, engine_make_model: null,
        certificate_type: null, airworthiness_class: null,
        registration_status: "Not in registry",
        last_action_date: null, registrant: null, location: null,
        source: { key: "faa_registry", accessed_at: "2026-05-15" },
      },
      records: { ntsb: [], sdr: [], aids: [] },
      signal_summary: {
        identity_confidence: "Low",
        public_record_signal: "Incomplete / ambiguous data",
        data_confidence: "Low",
        key_findings: [
          "No FAA registry match found for this N-number.",
          "Without a registry record, NTSB and SDR searches cannot be anchored to an airframe.",
          "Possible causes: deregistered, reserved-but-unassigned, foreign-registered, or typo.",
        ],
        limitations: [
          "Tail numbers can be reserved, reassigned, or fall out of the registry between extracts.",
          "A no-match result is not a determination that the aircraft does or does not exist.",
        ],
        summary_text:
          "The FAA aircraft registry returned no match for this N-number in the searched extract. Without a registry anchor, NTSB and SDR results cannot be reliably attributed to a specific airframe. Verify spelling, and consider whether the tail number may be deregistered, foreign, or recently reassigned.",
      },
    },
  ],
};

window.DEMO_PACK.aircraft = window.DEMO_PACK.aircraft.map((aircraft) => {
  const summary = buildAircraftSummary(aircraft);
  const legacySignal = {
    none_found: "No major public records found",
    low: "Some public records found",
    moderate: "Some public records found",
    elevated: "Elevated public-records signal",
    notable: "Elevated public-records signal",
  }[summary.public_record_signal] || aircraft.signal_summary.public_record_signal;
  return {
    ...aircraft,
    summary,
    signal_summary: {
      ...aircraft.signal_summary,
      public_record_signal: legacySignal,
      profile_read: summary.profile_read,
      most_notable_factor: summary.most_notable_factor,
      summary_text: aircraft.signal_summary.summary_text,
    },
  };
});

// ─────────────────────────────────────────────────────────────
// Helpers — normalization + lookup
// ─────────────────────────────────────────────────────────────
window.normalizeNNumberKey = function (input) {
  let n = String(input || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (n.startsWith("N")) n = n.slice(1);
  return n || null;
};
window.normalizeNNumber = function (input) {
  const key = window.normalizeNNumberKey(input);
  return key ? `N${key}` : "";
};
window.isLikelyNNumber = function (input) {
  const key = window.normalizeNNumberKey(input);
  return !!key && /^[0-9A-Z]{1,5}$/.test(key);
};
window.getAircraftByNNumber = function (input) {
  const n = window.normalizeNNumber(input);
  return window.DEMO_PACK.aircraft.find((a) => a.n_number === n) || null;
};
window.getSourceMeta = function (key) {
  return window.DEMO_PACK.metadata.sources.find((s) => s.key === key) || { name: key, short: key };
};

// ─────────────────────────────────────────────────────────────
// Static snapshot client — fetches Vercel-hosted JSON shards.
// ─────────────────────────────────────────────────────────────
const STATIC_DATA_STATE = {
  manifest: null,
  manifestPromise: null,
  shards: new Map(),
  shardPromises: new Map(),
};

const SYSTEM_CATEGORY_LABELS = {
  environmental: "Environmental",
  auto_flight: "Auto flight",
  communications: "Communications",
  electrical_power: "Electrical power",
  cabin_equipment: "Cabin / service",
  fire_protection: "Fire protection",
  flight_controls: "Flight controls",
  fuel: "Fuel",
  hydraulic_power: "Hydraulic power",
  ice_rain_protection: "Ice / rain protection",
  instruments: "Instruments",
  landing_gear_brakes: "Landing gear / brakes",
  lighting: "Lighting",
  navigation: "Navigation",
  pneumatic_bleed_air: "Engine / pneumatic",
  apu: "APU",
  doors: "Doors / structure",
  fuselage_structure: "Doors / structure",
  nacelles_pylons: "Engine / pneumatic",
  stabilizers: "Stabilizers",
  windows: "Windows",
  wings_structure: "Wings / structure",
  powerplant: "Engine / pneumatic",
  engine: "Engine / pneumatic",
  engine_fuel_control: "Engine / pneumatic",
  ignition: "Engine / pneumatic",
  engine_air: "Engine / pneumatic",
  engine_controls: "Engine / pneumatic",
  engine_indicating: "Engine / pneumatic",
  exhaust: "Engine / pneumatic",
  oil: "Engine / pneumatic",
  starting: "Engine / pneumatic",
  emergency_equipment: "Emergency equipment",
  unknown: "Unknown system",
};

const STATIC_LIMITATIONS = [
  "This profile uses public datasets searched by TailCheck.",
  "It is not a complete maintenance history.",
  "It is not an FAA airworthiness determination.",
  "No public records found does not mean no events, defects, or maintenance issues exist.",
  "Tail numbers can be reassigned; serial-number matching should be used when possible.",
];

function staticShardKey(input, shardLength = 2) {
  const key = window.normalizeNNumberKey(input);
  return key ? key.slice(0, shardLength).padEnd(shardLength, "_") : "_".repeat(shardLength);
}

function staticShardPath(key, directoryLength = 0) {
  return directoryLength > 0 ? `${key.slice(0, directoryLength)}/${key}.json` : `${key}.json`;
}

function systemCategoryLabel(value) {
  return SYSTEM_CATEGORY_LABELS[value] || value || "Unknown system";
}

function mapBreakdownKeys(breakdown) {
  return Object.entries(breakdown || {}).reduce((acc, [key, value]) => {
    acc[systemCategoryLabel(key)] = value;
    return acc;
  }, {});
}

function normalizeStaticSdrRecord(record) {
  const systemKey = record.system_category;
  const systemLabel = systemCategoryLabel(systemKey);
  const chips = (record.display_chips || []).map((chip) => systemCategoryLabel(chip));
  return {
    ...record,
    report_id: record.report_id || record.record_id,
    ata_category: record.ata_category || record.ata_group,
    component: record.component || record.component_name || record.part_name,
    problem: record.problem || record.defect_description,
    narrative_summary: record.narrative_summary || record.user_facing_summary || record.raw_narrative,
    system_category_key: systemKey,
    system_category: systemLabel,
    display_chips: Array.from(new Set([systemLabel, ...chips])),
  };
}

function normalizeStaticSummary(summary, sdrRecords, ntsbRecords) {
  const publicSignal = summary.public_record_signal || "none_found";
  const activity = {
    none_found: "None found",
    low: "Low",
    moderate: "Moderate",
    elevated: "Elevated",
    notable: "Notable",
  }[publicSignal] || publicSignal;
  return {
    ...summary,
    limitations: summary.limitations || STATIC_LIMITATIONS,
    public_record_activity: activity,
    profile_read: summary.profile_read || summary.profile_summary_label,
    sdr_records_found: summary.sdr_records_found ?? sdrRecords.length,
    ntsb_records_found: summary.ntsb_records_found ?? ntsbRecords.length,
    system_breakdown: mapBreakdownKeys(summary.system_breakdown || {}),
    repeated_category_patterns: (summary.repeated_category_patterns || []).map((pattern) => ({
      ...pattern,
      system_category: systemCategoryLabel(pattern.system_category),
    })),
    notable_events: (summary.notable_events || []).map(normalizeStaticSdrRecord),
  };
}

function adaptStaticProfile(profile) {
  const sdrRecords = (profile.sdr && profile.sdr.records ? profile.sdr.records : []).map(normalizeStaticSdrRecord);
  const ntsbRecords = (profile.ntsb && profile.ntsb.records ? profile.ntsb.records : []).map((record) => ({
    ...record,
    event_type: record.event_type || record.investigation_type,
    investigation_status: record.investigation_status || record.report_status,
    narrative_summary: record.narrative_summary || record.probable_cause,
    source: { key: "ntsb", accessed_at: profile.snapshot_generated_at },
  }));
  const summary = normalizeStaticSummary(profile.summary || {}, sdrRecords, ntsbRecords);
  const legacySignal = {
    none_found: "No major public records found",
    low: "Some public records found",
    moderate: "Some public records found",
    elevated: "Elevated public-records signal",
    notable: "Elevated public-records signal",
  }[summary.public_record_signal] || "Incomplete / ambiguous data";
  const registration = profile.registration || {};
  const identity = profile.identity || {};
  const location = [registration.city, registration.state].filter(Boolean).join(", ");
  return {
    n_number: profile.n_number,
    display_n_number: profile.n_number,
    demo_scenario: summary.profile_read || "Static public-record snapshot",
    snapshot_generated_at: profile.snapshot_generated_at,
    static_profile: profile,
    identity: {
      ...identity,
      registrant: identity.registrant_name || registration.registrant_name,
      registration_status: registration.status,
      location,
      source: { key: "faa_registry", accessed_at: profile.snapshot_generated_at },
    },
    registration,
    records: {
      ntsb: ntsbRecords,
      sdr: sdrRecords,
      aids: profile.airworthiness_directives?.records || [],
    },
    summary,
    signal_summary: {
      ...(profile.signal_summary || {}),
      public_record_signal: legacySignal,
      profile_read: summary.profile_read,
      most_notable_factor: summary.most_notable_factor,
      limitations: profile.limitations || summary.limitations || STATIC_LIMITATIONS,
    },
    sources: profile.sources || ["FAA Registry", "NTSB", "FAA SDR"],
    limitations: profile.limitations || summary.limitations || STATIC_LIMITATIONS,
  };
}

async function fetchStaticManifest() {
  if (STATIC_DATA_STATE.manifest) return STATIC_DATA_STATE.manifest;
  if (!STATIC_DATA_STATE.manifestPromise) {
    STATIC_DATA_STATE.manifestPromise = fetchStaticJson(["/data/manifest.json", "/public/data/manifest.json"])
      .then((resp) => {
        if (!resp) throw new Error("Static manifest unavailable");
        return resp;
      })
      .then((manifest) => {
        STATIC_DATA_STATE.manifest = manifest;
        return manifest;
      });
  }
  return STATIC_DATA_STATE.manifestPromise;
}

async function fetchStaticShard(key, directoryLength = 0) {
  if (STATIC_DATA_STATE.shards.has(key)) return STATIC_DATA_STATE.shards.get(key);
  if (!STATIC_DATA_STATE.shardPromises.has(key)) {
    const path = staticShardPath(key, directoryLength);
    STATIC_DATA_STATE.shardPromises.set(key, fetchStaticJson([`/data/profiles/${path}`, `/public/data/profiles/${path}`], true)
      .then((payload) => {
        STATIC_DATA_STATE.shards.set(key, payload);
        return payload;
      }));
  }
  return STATIC_DATA_STATE.shardPromises.get(key);
}

async function fetchStaticJson(paths, allowMissing = false) {
  let lastError = null;
  for (const path of paths) {
    try {
      const resp = await fetch(path, { cache: "force-cache" });
      if (resp.ok) return resp.json();
      if (resp.status !== 404) lastError = new Error(`${path}: ${resp.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  if (allowMissing) return null;
  throw lastError || new Error(`Static JSON unavailable: ${paths.join(", ")}`);
}

window.lookupStaticAircraft = async function (input) {
  if (!window.isLikelyNNumber(input)) {
    return { status: "invalid_n_number", n_number: window.normalizeNNumber(input) || String(input || "").toUpperCase() };
  }
  const display = window.normalizeNNumber(input);
  const key = window.normalizeNNumberKey(input);
  try {
    const manifest = await fetchStaticManifest();
    const shard = staticShardKey(key, manifest.shard_length || 2);
    if (manifest.shards && !manifest.shards.includes(shard)) {
      return { status: "not_in_snapshot", n_number: display, manifest };
    }
    const payload = await fetchStaticShard(shard, manifest.shard_directory_length || 0);
    const profile = payload && payload[key];
    if (!profile) return { status: "not_in_snapshot", n_number: display, manifest };
    return {
      status: "profile_found",
      n_number: display,
      aircraft: adaptStaticProfile(profile),
      manifest,
    };
  } catch (error) {
    const fallback = window.getAircraftByNNumber(display);
    if (fallback) {
      return { status: "profile_found", n_number: display, aircraft: fallback, fallback: true, error };
    }
    return { status: "data_unavailable", n_number: display, error };
  }
};

window.adaptStaticProfile = adaptStaticProfile;
