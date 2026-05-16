# Aircraft Public-Records Safety Profile — MVP / Prototype Build Plan

**Working concept:** A lightweight app that lets a user enter or photograph a U.S. aircraft tail number and view a public-records profile built from a small number of high-signal aviation datasets.

**Prototype strategy:** Start with a **curated demo pack** of 5–10 real tail numbers instead of building full ingestion pipelines immediately. The prototype should prove the concept, UX, record-matching logic, source transparency, and “public-records signal” language before committing to heavier data engineering.

**Recommended product framing:**  
Use **“Aircraft Public Safety Record”**, **“Aircraft Public-Records Profile”**, or **“TailCheck”**.  
Avoid “this aircraft is safe/unsafe” and avoid a fake precise numeric safety score.

---

## 1. Executive summary

The lightest credible prototype is:

1. Pick **6 real U.S. aircraft N-numbers** that represent different public-record scenarios.
2. Manually or semi-manually pull data from:
   - FAA Aircraft Registration Database / Aircraft Inquiry
   - NTSB Aviation Accident Database
   - FAA Service Difficulty Reports
   - Optional: FAA AIDS / ASIAS incident database
3. Store the curated records in a single static JSON file.
4. Build a Next.js app that searches that JSON file by N-number.
5. Display:
   - aircraft identity,
   - public-records signal,
   - NTSB accident/incident cards,
   - FAA SDR maintenance-defect cards,
   - data confidence,
   - source badges,
   - limitations/disclaimer,
   - raw records.
6. Add photo/OCR lookup after typed lookup works.
7. Add full ingestion, Supabase, and more data only after the demo resonates.

This is enough to demonstrate the **art of the possible** without building a production aviation data platform prematurely.

---

## 2. Product principles

### 2.1 What the app should do

The app should answer:

> “What public safety, incident, accident, and maintenance-defect records can we find for this aircraft or closely related identity?”

It should surface public-record signals in a way that is useful to:

- aircraft buyers,
- charter customers,
- private aviation passengers,
- aviation attorneys,
- brokers,
- insurers,
- journalists,
- auditors,
- lenders,
- aviation-curious consumers.

### 2.2 What the app should not claim

The app should **not** claim:

- that an aircraft is safe or unsafe,
- that it has a complete maintenance history,
- that no record means no problem,
- that a specific Airworthiness Directive has been complied with,
- that public data proves current airworthiness,
- that tail-number matches are always historically reliable.

### 2.3 Recommended language

Use:

> “No NTSB accident records were found in the searched public datasets.”

Avoid:

> “This aircraft has never crashed.”

Use:

> “FAA Service Difficulty Reports are public malfunction/defect reports and may not represent a complete maintenance history.”

Avoid:

> “This aircraft has had four maintenance failures.”

Use:

> “Public-records signal: Some records found.”

Avoid:

> “Safety score: 82/100.”

---

## 3. Prototype scope

## 3.1 MVP v0: curated demo pack

**Core idea:** Search works for a preselected set of 5–10 N-numbers only.

### Included

- Typed N-number lookup
- Static curated JSON data
- FAA registry identity card
- NTSB accident/incident records
- FAA SDR maintenance-defect records
- Optional FAA AIDS incident records
- Deterministic signal label
- Source badges
- Plain-English templated summary
- Raw source record details
- Clear limitations

### Excluded

- Full FAA registry ingestion
- Full NTSB ingestion
- Full SDR ingestion
- Real-time ADS-B / flight tracking
- Airline flight-number lookup
- International registries
- Owner/person lookup
- FOIA aircraft files
- Maintenance logbook upload
- Numeric “safety score”
- Production-grade auth
- Payments
- Operator reputation scoring

---

## 4. MVP data sources

The prototype should use the same sources that would later become production datasets, but only for a handful of curated aircraft.

### 4.1 FAA Aircraft Registration Database / Aircraft Inquiry

**Purpose:** Aircraft identity spine.

Use for:

- N-number,
- manufacturer,
- model,
- serial number,
- aircraft type,
- engine type,
- certificate type,
- registration status,
- certificate issue date,
- aircraft year if available.

**Why it matters:** Every record in the app should anchor back to the aircraft identity. If identity is weak, the whole profile is weak.

**Official source notes:** FAA provides a downloadable Aircraft Registration Database and an Aircraft Inquiry lookup. The downloadable database is listed by FAA as a 60MB download, with supporting documentation for file content and configuration.

### 4.2 NTSB Aviation Accident Database

**Purpose:** Accident and selected incident history.

Use for:

- event date,
- location,
- accident/incident classification,
- aircraft registration,
- make/model,
- injury severity,
- aircraft damage,
- investigation status,
- probable cause,
- narrative summary,
- docket/report link when available.

**Why it matters:** This is the highest-signal source for historical public safety events.

**Official source notes:** NTSB provides downloadable aviation accident datasets, including datasets from 1962–1981 and 1982–present. NTSB also provides aviation accident query pages and monthly accident lists.

### 4.3 FAA Service Difficulty Reports — SDR

**Purpose:** Maintenance-defect / malfunction / failure signal.

Use for:

- report date,
- aircraft registration,
- make/model,
- component,
- ATA code,
- problem/failure description,
- narrative,
- part information if available.

**Why it matters:** SDRs can show maintenance-defect signals that do not rise to the level of an accident.

**Official source notes:** FAA provides SDR CSV downloads by year. The FAA describes SDR files as including information submitted by operators and repair stations regarding malfunctions, failures, or defects found in aircraft.

### 4.4 Optional: FAA Accident and Incident Data System — AIDS / ASIAS

**Purpose:** Incident records that may not appear as NTSB accident records.

Use for:

- date,
- event location,
- aircraft registration,
- make/model,
- operator,
- narrative,
- findings,
- weather/environment,
- pilot information where available.

**Why it matters:** Good enrichment layer when a tail number has FAA incident reports but not a major NTSB accident.

**Official source notes:** FAA AIDS contains aviation incident records from 1978 to present and can be searched by criteria including aircraft registration number, make/model, operator, date range, state, airport, and operation type.

### 4.5 Deferred: FAA Airworthiness Directives

**Purpose:** Model/component-level known unsafe conditions requiring mandatory action.

**Why defer:** ADs are valuable but harder for the curated aircraft demo because they often apply to make/model, engine, propeller, appliances, or installed components, not simply to an N-number. They are better as a v1.5 enrichment layer.

---

## 5. Demo aircraft selection plan

Start with **6 curated aircraft**.

The point is not to pick famous aircraft. The point is to pick records that exercise the product.

| Demo slot | Scenario | Why it matters |
|---:|---|---|
| 1 | Clean-looking active aircraft | Shows normal “no major public records found” result |
| 2 | Aircraft with NTSB accident history | Shows high-signal record discovery |
| 3 | Aircraft with one or more SDRs | Shows maintenance-defect signal |
| 4 | Aircraft with repeated SDR category | Shows pattern detection |
| 5 | Older / ambiguous / deregistered aircraft | Shows data-confidence limitations |
| 6 | Charter/business-style aircraft | Shows future operator context |

### 5.1 Selection rules

Prefer aircraft where:

- the N-number is visible in public records,
- FAA registration lookup is available,
- NTSB record can be tied to N-number and/or serial number,
- SDR records can be found by N-number or make/model,
- records are not so sensitive or sensational that the demo becomes about a celebrity/private owner,
- the records illustrate different data states.

### 5.2 Demo record types to intentionally include

The curated pack should include:

- at least one aircraft with **0 NTSB records**,
- at least one aircraft with **1+ NTSB records**,
- at least one aircraft with **1+ SDR records**,
- at least one aircraft with **multiple SDRs in the same system area**,
- at least one aircraft where the app must explain **data limitations**,
- at least one aircraft where model/operator context would be useful later.

---

## 6. Manual data collection workflow

For each candidate N-number, create a source packet.

### 6.1 Source packet checklist

For each aircraft:

- [ ] Normalize the N-number.
- [ ] Search FAA Aircraft Inquiry.
- [ ] Capture FAA identity fields.
- [ ] Capture FAA source URL and access date.
- [ ] Search NTSB Aviation Accident Database.
- [ ] Capture all matching records.
- [ ] Note whether match is by N-number, serial number, make/model, or ambiguous.
- [ ] Search FAA SDRS / SDR downloads.
- [ ] Capture matching SDR records.
- [ ] Search FAA AIDS / ASIAS if feasible.
- [ ] Capture matching incident records.
- [ ] Assign public-records signal label.
- [ ] Assign data-confidence label.
- [ ] Write a plain-English summary.
- [ ] Write limitations for that aircraft.
- [ ] Store raw records in JSON.

### 6.2 Data collection columns

Create a spreadsheet first, then convert to JSON.

Recommended spreadsheet tabs:

1. `aircraft_identity`
2. `ntsb_records`
3. `sdr_records`
4. `aids_records`
5. `signal_summary`
6. `source_notes`

#### `aircraft_identity`

| Column | Description |
|---|---|
| `n_number` | Normalized N-number, no spaces or dashes |
| `display_n_number` | Pretty display version, e.g. `N123AB` |
| `manufacturer` | FAA manufacturer |
| `model` | FAA model |
| `serial_number` | FAA serial number |
| `year_mfr` | Year manufactured, if available |
| `aircraft_type` | Fixed wing, rotorcraft, etc. |
| `engine_type` | Reciprocating, turbojet, turboprop, etc. |
| `certificate_type` | Standard, restricted, experimental, etc. |
| `registration_status` | Valid, expired, canceled, etc. |
| `registry_source_url` | Source URL |
| `registry_accessed_at` | Date captured |

#### `ntsb_records`

| Column | Description |
|---|---|
| `n_number` | Normalized N-number |
| `event_id` | NTSB event ID |
| `event_date` | Date |
| `event_type` | Accident / incident |
| `location` | Location |
| `injury_severity` | Fatal, serious, minor, none, unknown |
| `aircraft_damage` | Destroyed, substantial, minor, none, unknown |
| `investigation_status` | Final, preliminary, unknown |
| `probable_cause` | Public probable cause text, summarized if long |
| `narrative_summary` | Short summary |
| `match_basis` | N-number, serial number, make/model, ambiguous |
| `source_url` | NTSB source |
| `accessed_at` | Date captured |

#### `sdr_records`

| Column | Description |
|---|---|
| `n_number` | Normalized N-number |
| `report_date` | SDR date |
| `manufacturer` | SDR manufacturer |
| `model` | SDR model |
| `ata_code` | ATA code |
| `ata_category` | Derived category |
| `component` | Component |
| `problem` | Failure/malfunction/defect |
| `narrative_summary` | Summary of SDR narrative |
| `criticality_guess` | Low, medium, high — transparent prototype heuristic |
| `match_basis` | N-number, serial number, make/model |
| `source_url` | FAA SDR source |
| `accessed_at` | Date captured |

#### `signal_summary`

| Column | Description |
|---|---|
| `n_number` | Normalized N-number |
| `identity_confidence` | High, medium, low |
| `public_record_signal` | One of four prototype labels |
| `data_confidence` | High, medium, low |
| `key_findings` | JSON array or pipe-delimited list |
| `limitations` | JSON array or pipe-delimited list |
| `summary_text` | Human-readable summary |
| `recommended_next_question` | Optional “ask operator about…” question |

---

## 7. Static JSON data contract

Create:

```text
/demo-data/aircraft-demo-pack.json
```

### 7.1 Full JSON shape

```json
{
  "metadata": {
    "name": "Aircraft Public-Records Demo Pack",
    "version": "0.1.0",
    "generated_at": "2026-05-15",
    "description": "Curated aircraft public-record profiles for prototype demonstration only.",
    "sources": [
      {
        "name": "FAA Aircraft Registration Database / Aircraft Inquiry",
        "source_type": "registry",
        "url": "https://registry.faa.gov/aircraftinquiry"
      },
      {
        "name": "NTSB Aviation Accident Database",
        "source_type": "accident_incident",
        "url": "https://www.ntsb.gov/Pages/AviationQuery.aspx"
      },
      {
        "name": "FAA Service Difficulty Reports",
        "source_type": "maintenance_defect",
        "url": "https://www.faa.gov/av-info/download_SDR"
      },
      {
        "name": "FAA AIDS / ASIAS",
        "source_type": "incident",
        "url": "https://www.asias.faa.gov/"
      }
    ],
    "limitations": [
      "This demo pack is manually curated and is not a complete aircraft history.",
      "Public datasets may be incomplete, delayed, corrected, or difficult to match.",
      "Tail numbers can be reassigned; serial-number matching is preferred when available.",
      "The app does not determine whether an aircraft is currently airworthy or safe."
    ]
  },
  "aircraft": [
    {
      "n_number": "N123AB",
      "display_n_number": "N123AB",
      "demo_scenario": "Clean-looking active aircraft",
      "identity": {
        "manufacturer": "CESSNA",
        "model": "172S",
        "serial_number": "172S12345",
        "year_mfr": "2004",
        "aircraft_type": "Fixed wing single-engine",
        "engine_type": "Reciprocating",
        "certificate_type": "Standard",
        "registration_status": "Valid",
        "source": {
          "name": "FAA Aircraft Inquiry",
          "url": "https://registry.faa.gov/aircraftinquiry",
          "accessed_at": "2026-05-15"
        }
      },
      "records": {
        "ntsb": [],
        "sdr": [],
        "aids": []
      },
      "signal_summary": {
        "identity_confidence": "High",
        "public_record_signal": "No major public records found",
        "data_confidence": "Medium",
        "key_findings": [
          "Aircraft matched FAA registry by N-number.",
          "No NTSB accident records were found in the searched public datasets.",
          "No FAA SDR records were included in this curated demo profile."
        ],
        "limitations": [
          "This is not a complete maintenance history.",
          "No public records found does not mean no safety or maintenance issues exist."
        ],
        "summary_text": "This aircraft matched the FAA registry by N-number. In the searched public datasets included in this demo, no NTSB accident records or FAA SDR records were found. This does not determine that the aircraft is safe or currently airworthy."
      }
    }
  ]
}
```

### 7.2 NTSB record object

```json
{
  "event_id": "20240101X12345",
  "event_date": "2024-01-01",
  "event_type": "Accident",
  "location": "Orlando, FL",
  "injury_severity": "Nonfatal",
  "aircraft_damage": "Substantial",
  "investigation_status": "Final",
  "probable_cause": "Summarized probable cause text.",
  "narrative_summary": "Short public-record summary of the event.",
  "match_basis": "N-number",
  "source": {
    "name": "NTSB Aviation Accident Database",
    "url": "https://www.ntsb.gov/Pages/AviationQuery.aspx",
    "accessed_at": "2026-05-15"
  }
}
```

### 7.3 SDR record object

```json
{
  "report_date": "2023-08-12",
  "manufacturer": "CESSNA",
  "model": "172S",
  "ata_code": "24",
  "ata_category": "Electrical Power",
  "component": "Alternator",
  "problem": "Failure / malfunction",
  "narrative_summary": "Short summary of public SDR narrative.",
  "criticality_guess": "Medium",
  "match_basis": "N-number",
  "source": {
    "name": "FAA Service Difficulty Reports",
    "url": "https://www.faa.gov/av-info/download_SDR",
    "accessed_at": "2026-05-15"
  }
}
```

### 7.4 AIDS record object

```json
{
  "report_number": "AIDS-EXAMPLE-001",
  "event_date": "2022-04-10",
  "location": "Jacksonville, FL",
  "aircraft_make": "CESSNA",
  "aircraft_model": "172S",
  "operator": "Unknown",
  "narrative_summary": "Short public incident summary.",
  "findings_summary": "Short findings summary if available.",
  "match_basis": "N-number",
  "source": {
    "name": "FAA AIDS / ASIAS",
    "url": "https://www.asias.faa.gov/",
    "accessed_at": "2026-05-15"
  }
}
```

---

## 8. Signal model

### 8.1 Prototype labels

Use four labels only.

| Label | Meaning |
|---|---|
| `No major public records found` | Valid identity match, no accident records, no concerning SDR pattern found in demo data |
| `Some public records found` | SDRs and/or non-severe incident records found |
| `Elevated public-records signal` | Accident, serious incident, repeated critical-system SDRs, or recent severe record |
| `Incomplete / ambiguous data` | Weak identity match, old/reassigned tail number, missing serial, or insufficient public data |

### 8.2 Identity confidence

| Confidence | Criteria |
|---|---|
| High | FAA registry match by N-number and serial number available |
| Medium | FAA registry match by N-number, but serial number missing or unresolved |
| Low | N-number not found, canceled/reassigned, or conflict across sources |

### 8.3 Data confidence

| Confidence | Criteria |
|---|---|
| High | Multiple sources searched, identity strong, source records consistent |
| Medium | Core sources searched, but public maintenance completeness limited |
| Low | Source conflicts, old records, missing serial, uncertain match |

### 8.4 SDR critical categories

For prototype heuristics, treat these categories as potentially more important:

- ATA 21 — Air Conditioning / pressurization
- ATA 22 — Auto Flight
- ATA 24 — Electrical Power
- ATA 27 — Flight Controls
- ATA 28 — Fuel
- ATA 29 — Hydraulic Power
- ATA 32 — Landing Gear
- ATA 34 — Navigation
- ATA 49 — Airborne Auxiliary Power
- ATA 52 — Doors
- ATA 71–80 — Powerplant/engine-related systems

Important: label this as a **prototype heuristic**, not an aviation-certification determination.

### 8.5 Signal engine pseudocode

```ts
type SignalLabel =
  | "No major public records found"
  | "Some public records found"
  | "Elevated public-records signal"
  | "Incomplete / ambiguous data";

function calculateSignal(profile: AircraftProfile): SignalLabel {
  if (profile.signal_summary.identity_confidence === "Low") {
    return "Incomplete / ambiguous data";
  }

  const ntsbRecords = profile.records.ntsb ?? [];
  const sdrRecords = profile.records.sdr ?? [];
  const aidsRecords = profile.records.aids ?? [];

  const hasFatalOrSeriousAccident = ntsbRecords.some((r) =>
    ["Fatal", "Serious"].includes(r.injury_severity)
  );

  const hasAnyAccident = ntsbRecords.some((r) =>
    r.event_type.toLowerCase().includes("accident")
  );

  const criticalSdrs = sdrRecords.filter((r) =>
    ["21", "22", "24", "27", "28", "29", "32", "34", "49", "52"].includes(
      String(r.ata_code).slice(0, 2)
    )
  );

  const repeatedCriticalAta = hasRepeatedAtaCategory(criticalSdrs);

  if (hasFatalOrSeriousAccident || repeatedCriticalAta) {
    return "Elevated public-records signal";
  }

  if (hasAnyAccident) {
    return "Elevated public-records signal";
  }

  if (sdrRecords.length > 0 || aidsRecords.length > 0) {
    return "Some public records found";
  }

  return "No major public records found";
}
```

### 8.6 Do not infer too much

The signal engine should only make claims supported by structured data.

Example valid finding:

> “Three SDRs in this demo profile are categorized under ATA 24 — Electrical Power.”

Invalid finding:

> “This aircraft has an electrical safety problem.”

---

## 9. UX requirements

## 9.1 Page 1 — Search

### Required elements

- Product name
- Search input
- Helper text
- Example N-numbers from curated demo pack
- Disclaimer microcopy

### Suggested copy

```text
Search a U.S. aircraft tail number

Enter a U.S. N-number to view public registration, accident, incident, and service-difficulty records.

This prototype searches a curated demo dataset and does not determine whether an aircraft is safe or currently airworthy.
```

### Search behavior

- Accept lowercase or uppercase.
- Accept with or without spaces/dashes.
- Normalize to uppercase.
- Require N-number-like format.
- If N-number not in demo pack, show a “not included in demo” state.

### Not-in-demo state

```text
This aircraft is not included in the current prototype demo pack.

The production version would search FAA, NTSB, SDR, and incident datasets. For now, choose one of the demo aircraft below.
```

## 9.2 Page 2 — Aircraft profile

### Layout

1. Aircraft header
2. Signal summary panel
3. Source coverage strip
4. Aircraft identity card
5. NTSB records section
6. FAA SDR records section
7. FAA AIDS records section, if included
8. Data confidence / limitations
9. Raw JSON/source detail drawer

### Header example

```text
N123AB
Cessna 172S

Public-records signal:
Some public records found

Data confidence:
Medium
```

### Source coverage strip

| Source | Status |
|---|---|
| FAA Registry | Matched |
| NTSB | 1 record |
| FAA SDR | 4 records |
| FAA AIDS | Not searched |
| ADs | Not included in prototype |

### Public-records summary panel

Should contain:

- plain-English summary,
- 3–5 key findings,
- limitations,
- “not a safety determination” banner.

### Record cards

Each NTSB/SDR/AIDS record should show:

- source badge,
- date,
- event/report type,
- severity or ATA category,
- short summary,
- match basis,
- source link,
- “view details” drawer.

## 9.3 Page 3 — Detail drawer

When a user clicks a record:

- show full record fields,
- source name,
- source URL,
- capture date,
- match basis,
- raw notes,
- limitation note.

## 9.4 Mobile UX

The app should work well on a phone because the eventual use case might be standing near an aircraft or looking at a photo.

Mobile priorities:

- large search input,
- sticky signal label,
- collapsible record sections,
- readable source badges,
- no giant tables on mobile.

---

## 10. Technical architecture

## 10.1 v0 architecture

```text
User
  ↓
Next.js app
  ↓
Static demo JSON file
  ↓
Signal engine / display helpers
  ↓
Aircraft profile page
```

No database is required for v0.

## 10.2 Recommended stack

| Layer | Recommendation |
|---|---|
| Frontend | Next.js / React / TypeScript |
| Styling | Tailwind or simple CSS modules |
| Data | Static JSON |
| Hosting | Vercel |
| Validation | Zod |
| Testing | Vitest + Playwright |
| Photo OCR later | Vision API or OCR library |
| Production database later | Supabase Postgres |

## 10.3 Suggested repo structure

```text
aircraft-public-records/
  README.md
  package.json
  next.config.js
  tsconfig.json
  app/
    page.tsx
    aircraft/
      [nNumber]/
        page.tsx
    api/
      aircraft/
        [nNumber]/
          route.ts
  components/
    AircraftHeader.tsx
    AircraftIdentityCard.tsx
    PublicRecordSignal.tsx
    SourceCoverageStrip.tsx
    RecordCard.tsx
    RecordsSection.tsx
    LimitationsBanner.tsx
    DemoAircraftPicker.tsx
  data/
    aircraft-demo-pack.json
  lib/
    aircraft-types.ts
    normalizeNNumber.ts
    loadDemoData.ts
    signalEngine.ts
    sourceCoverage.ts
    summaryTemplates.ts
  scripts/
    validate-demo-pack.ts
    spreadsheet-to-json.ts
  tests/
    normalizeNNumber.test.ts
    signalEngine.test.ts
    demoPackSchema.test.ts
  docs/
    MVP_BUILD_PLAN.md
    DATA_COLLECTION_SOP.md
    PRODUCT_COPY.md
```

---

## 11. TypeScript data model

Create:

```text
/lib/aircraft-types.ts
```

```ts
export type ConfidenceLabel = "High" | "Medium" | "Low";

export type PublicRecordSignal =
  | "No major public records found"
  | "Some public records found"
  | "Elevated public-records signal"
  | "Incomplete / ambiguous data";

export interface SourceRef {
  name: string;
  url?: string;
  accessed_at?: string;
}

export interface AircraftIdentity {
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  year_mfr?: string;
  aircraft_type?: string;
  engine_type?: string;
  certificate_type?: string;
  registration_status?: string;
  source: SourceRef;
}

export interface NtsbRecord {
  event_id?: string;
  event_date?: string;
  event_type?: string;
  location?: string;
  injury_severity?: string;
  aircraft_damage?: string;
  investigation_status?: string;
  probable_cause?: string;
  narrative_summary?: string;
  match_basis?: string;
  source: SourceRef;
}

export interface SdrRecord {
  report_date?: string;
  manufacturer?: string;
  model?: string;
  ata_code?: string;
  ata_category?: string;
  component?: string;
  problem?: string;
  narrative_summary?: string;
  criticality_guess?: "Low" | "Medium" | "High";
  match_basis?: string;
  source: SourceRef;
}

export interface AidsRecord {
  report_number?: string;
  event_date?: string;
  location?: string;
  aircraft_make?: string;
  aircraft_model?: string;
  operator?: string;
  narrative_summary?: string;
  findings_summary?: string;
  match_basis?: string;
  source: SourceRef;
}

export interface SignalSummary {
  identity_confidence: ConfidenceLabel;
  public_record_signal: PublicRecordSignal;
  data_confidence: ConfidenceLabel;
  key_findings: string[];
  limitations: string[];
  summary_text: string;
  recommended_next_questions?: string[];
}

export interface AircraftProfile {
  n_number: string;
  display_n_number: string;
  demo_scenario?: string;
  identity: AircraftIdentity;
  records: {
    ntsb: NtsbRecord[];
    sdr: SdrRecord[];
    aids: AidsRecord[];
  };
  signal_summary: SignalSummary;
}
```

---

## 12. N-number normalization

Create:

```text
/lib/normalizeNNumber.ts
```

### Requirements

- Trim whitespace.
- Uppercase.
- Remove spaces and dashes.
- Ensure starts with `N`.
- Reject impossible empty values.
- For prototype, allow a broad N-number-like regex rather than perfect FAA validation.

### Example

```ts
export function normalizeNNumber(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");
}

export function isLikelyNNumber(input: string): boolean {
  const normalized = normalizeNNumber(input);
  return /^N[0-9A-Z]{1,5}$/.test(normalized);
}
```

### Test cases

| Input | Output |
|---|---|
| `n123ab` | `N123AB` |
| `N-123AB` | `N123AB` |
| ` n 123 ab ` | `N123AB` |
| `123AB` | invalid unless app auto-prefixes |
| `hello` | invalid |

---

## 13. API route

Even with static JSON, expose a simple API route so the architecture can later move to a database.

```text
/app/api/aircraft/[nNumber]/route.ts
```

Example behavior:

```ts
import { NextResponse } from "next/server";
import { normalizeNNumber } from "@/lib/normalizeNNumber";
import { getAircraftByNNumber } from "@/lib/loadDemoData";

export async function GET(
  _request: Request,
  { params }: { params: { nNumber: string } }
) {
  const nNumber = normalizeNNumber(params.nNumber);
  const profile = await getAircraftByNNumber(nNumber);

  if (!profile) {
    return NextResponse.json(
      {
        found: false,
        n_number: nNumber,
        message: "Aircraft not found in the current prototype demo pack."
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    found: true,
    profile
  });
}
```

---

## 14. Validation

Use Zod to validate the JSON file at build time.

Create:

```text
/scripts/validate-demo-pack.ts
```

Validation should catch:

- missing N-number,
- duplicate N-numbers,
- invalid signal labels,
- missing source name,
- missing summary,
- record arrays missing,
- malformed URLs where included,
- missing source access dates.

Prototype should fail build if demo data is malformed.

---

## 15. Summary generation

## 15.1 v0: templated summary

Do not use an LLM yet. Use deterministic text based on the JSON summary.

Example:

```ts
export function buildSummary(profile: AircraftProfile): string {
  const ntsbCount = profile.records.ntsb.length;
  const sdrCount = profile.records.sdr.length;
  const aidsCount = profile.records.aids.length;

  return [
    `${profile.display_n_number} matched the FAA registry profile included in this demo.`,
    `The curated public-record profile includes ${ntsbCount} NTSB record(s), ${sdrCount} FAA SDR record(s), and ${aidsCount} FAA AIDS incident record(s).`,
    profile.signal_summary.summary_text,
    `This is not a complete maintenance history or a determination that the aircraft is safe or currently airworthy.`
  ].join(" ");
}
```

## 15.2 v1: LLM summary

Only after the deterministic prototype works.

The LLM should be constrained to summarize structured records and cite source cards.

### LLM system behavior

- Do not add facts not present in structured input.
- Do not say aircraft is safe or unsafe.
- Do not claim completeness.
- Use “searched public datasets.”
- Mention confidence and limitations.
- Cite source labels.
- Prefer short plain English.

### Prompt template

```text
You are summarizing a public aviation records profile for a prototype app.

Rules:
- Use only the structured data provided.
- Do not infer that the aircraft is safe or unsafe.
- Do not claim this is a complete maintenance history.
- Use the phrase "searched public datasets" when discussing absence of records.
- Mention data confidence.
- Keep the summary under 175 words.
- Include 3-5 key findings.
- Include 1-3 limitations.

Structured data:
{{AIRCRAFT_PROFILE_JSON}}
```

---

## 16. Visual design

## 16.1 Tone

The app should feel like:

- aviation data intelligence,
- Carfax-like,
- serious but understandable,
- transparent,
- not alarmist.

## 16.2 Color/status language

Avoid panic colors unless truly needed.

Suggested labels:

| Signal | Tone |
|---|---|
| No major public records found | calm / neutral-positive |
| Some public records found | informational |
| Elevated public-records signal | caution |
| Incomplete / ambiguous data | neutral warning |

## 16.3 Page sections

Recommended order:

1. Search result header
2. Public-records signal
3. Data confidence
4. Source coverage
5. Key findings
6. Aircraft identity
7. Accident / incident history
8. Service difficulty reports
9. Limitations
10. Raw records

---

## 17. Source transparency

Every claim should be traceable to a source category.

### Examples

```text
FAA Registry
Matched active registration profile for N123AB.
```

```text
NTSB
One accident record found in searched NTSB records.
```

```text
FAA SDR
Three Service Difficulty Reports included in this profile.
```

```text
Prototype Limitation
This demo pack is manually curated and may not include every public record.
```

---

## 18. Data limitations banner

Put this on every aircraft profile.

Suggested copy:

```text
This profile is based only on public datasets included in this prototype. It is not a complete maintenance history, inspection report, or determination that an aircraft is safe, unsafe, or currently airworthy. Public records may be incomplete, delayed, corrected, or difficult to match. Tail numbers can also be reassigned, so serial-number matching is preferred when available.
```

Shorter mobile version:

```text
Public-records only. Not a complete maintenance history or airworthiness determination.
```

---

## 19. Development backlog

## Epic 1 — Project setup

| Priority | Task | Acceptance criteria |
|---:|---|---|
| P0 | Create Next.js TypeScript project | App runs locally |
| P0 | Add basic styling system | Pages render cleanly on desktop/mobile |
| P0 | Add repo docs | README explains concept and limitations |
| P0 | Add demo JSON file | App can import static data |
| P1 | Add linting/formatting | Consistent code style |
| P1 | Add test framework | Unit tests run |

## Epic 2 — Demo data pack

| Priority | Task | Acceptance criteria |
|---:|---|---|
| P0 | Pick 6 demo aircraft scenarios | Each scenario maps to a reason |
| P0 | Collect FAA registry identity for each | Each profile has manufacturer/model/serial/status where available |
| P0 | Collect NTSB records | Each aircraft has `ntsb` array, even if empty |
| P0 | Collect SDR records | Each aircraft has `sdr` array, even if empty |
| P1 | Collect FAA AIDS records | Included where practical |
| P1 | Add source URLs/access dates | Every source card has provenance |
| P0 | Write signal summary for each | Each profile has label, confidence, findings, limitations |
| P0 | Validate JSON schema | Bad data fails validation |

## Epic 3 — Search and routing

| Priority | Task | Acceptance criteria |
|---:|---|---|
| P0 | Build homepage search | User can enter N-number |
| P0 | Normalize N-number | Lowercase/spaces/dashes handled |
| P0 | Route to aircraft profile | `/aircraft/N123AB` works |
| P0 | Handle not-in-demo | Helpful state appears |
| P1 | Add demo aircraft picker | User can select sample records |
| P2 | Add recent searches | Local only |

## Epic 4 — Aircraft profile UI

| Priority | Task | Acceptance criteria |
|---:|---|---|
| P0 | Build aircraft header | N-number, make/model visible |
| P0 | Build signal card | Label and confidence visible |
| P0 | Build source coverage strip | Shows searched/matched source state |
| P0 | Build identity card | FAA registry fields shown |
| P0 | Build record sections | NTSB/SDR/AIDS sections render |
| P1 | Build detail drawer/modal | Raw record fields visible |
| P1 | Add empty states | Clear “no records found in demo data” language |
| P1 | Add mobile polish | Usable on phone |
| P2 | Add print/export view | Nice-to-have |

## Epic 5 — Signal engine

| Priority | Task | Acceptance criteria |
|---:|---|---|
| P0 | Define four signal labels | Labels implemented centrally |
| P0 | Implement identity confidence helper | High/Medium/Low rendered |
| P0 | Implement source counts | Counts displayed correctly |
| P0 | Implement SDR ATA grouping | SDRs grouped by ATA category |
| P1 | Implement repeated-category flag | Repeated SDR category displayed |
| P1 | Implement signal calculation fallback | Can calculate if summary missing |
| P2 | Version signal rules | Rules documented and versioned |

## Epic 6 — Copy and risk guardrails

| Priority | Task | Acceptance criteria |
|---:|---|---|
| P0 | Add limitations banner | Appears on every profile |
| P0 | Avoid unsafe/safe wording | Copy review passes |
| P0 | Add source badges | All records show source |
| P1 | Add data confidence explanation | User understands why confidence is not absolute |
| P1 | Add “what to ask operator” section | Helpful next-step questions |
| P2 | Add terms/disclaimer page | Prototype-level legal guardrails |

## Epic 7 — Photo/OCR lookup

Defer until typed lookup works.

| Priority | Task | Acceptance criteria |
|---:|---|---|
| P2 | Add upload UI | User can upload aircraft photo |
| P2 | Extract text candidate | OCR/vision returns possible N-number |
| P2 | Confirmation step | User must confirm/edit detected N-number |
| P2 | Run lookup | Confirmed number routes to profile |

## Epic 8 — Production data path

Later, after v0.

| Priority | Task | Acceptance criteria |
|---:|---|---|
| Later | Add Supabase | Tables created |
| Later | Ingest FAA registry | Full registry searchable |
| Later | Ingest NTSB | NTSB searchable by N-number/serial |
| Later | Ingest SDR | Recent SDRs searchable |
| Later | Add scheduled refresh | Data refreshed on cadence |
| Later | Add AD enrichment | Model/component alerts visible |
| Later | Add operator context | Operator-level signals |

---

## 20. Build phases

## Phase 0 — Repo + static UI skeleton

**Outcome:** Clickable shell.

Tasks:

- create Next.js project,
- create homepage,
- create aircraft profile route,
- add placeholder demo data,
- render basic cards.

Definition of done:

- app runs locally,
- search page exists,
- one sample profile renders.

## Phase 1 — Curated demo pack

**Outcome:** Real public-record demo data.

Tasks:

- select 6 aircraft,
- collect FAA registry data,
- collect NTSB records,
- collect SDR records,
- optional AIDS records,
- write source notes,
- populate JSON,
- validate JSON.

Definition of done:

- 6 real profiles included,
- each has source traceability,
- each has summary and limitations.

## Phase 2 — Signal and source UX

**Outcome:** App feels like an intelligence product.

Tasks:

- add source coverage strip,
- add public-records signal card,
- add data confidence label,
- group SDRs by ATA,
- display key findings,
- display limitations,
- add record cards and details.

Definition of done:

- user can understand why a label appears,
- every major finding has source support.

## Phase 3 — Demo polish

**Outcome:** Investor/customer/demo-ready prototype.

Tasks:

- improve responsive layout,
- add example aircraft picker,
- add clean empty states,
- add disclaimer page,
- add demo walkthrough notes,
- add basic tests.

Definition of done:

- app is deployable on Vercel,
- nontechnical user can use it,
- demo flow is clear.

## Phase 4 — Photo lookup

**Outcome:** “Magic moment.”

Tasks:

- upload image,
- OCR/vision tail-number extraction,
- confirmation step,
- route to lookup.

Definition of done:

- user can upload photo,
- app proposes N-number,
- user confirms,
- app loads profile if in demo pack.

## Phase 5 — Real ingestion pilot

**Outcome:** Move beyond curated pack.

Tasks:

- add Supabase,
- create database schema,
- write FAA registry ingestion,
- write NTSB ingestion,
- write SDR ingestion for recent years,
- build matching rules,
- run for subset,
- compare to curated pack.

Definition of done:

- app can search more than curated profiles,
- data quality and matching limitations documented.

---

## 21. Production database model — future path

When moving past JSON, use this table structure.

### `aircraft_registry`

```sql
create table aircraft_registry (
  id uuid primary key default gen_random_uuid(),
  n_number text not null,
  serial_number text,
  manufacturer text,
  model text,
  year_mfr text,
  aircraft_type text,
  engine_type text,
  certificate_type text,
  registration_status text,
  source_url text,
  source_loaded_at timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_aircraft_registry_n_number on aircraft_registry (n_number);
create index idx_aircraft_registry_serial on aircraft_registry (serial_number);
```

### `ntsb_records`

```sql
create table ntsb_records (
  id uuid primary key default gen_random_uuid(),
  event_id text,
  n_number text,
  serial_number text,
  event_date date,
  event_type text,
  location text,
  injury_severity text,
  aircraft_damage text,
  investigation_status text,
  probable_cause text,
  narrative_summary text,
  source_url text,
  source_loaded_at timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_ntsb_n_number on ntsb_records (n_number);
create index idx_ntsb_serial on ntsb_records (serial_number);
create index idx_ntsb_event_date on ntsb_records (event_date);
```

### `sdr_records`

```sql
create table sdr_records (
  id uuid primary key default gen_random_uuid(),
  report_id text,
  n_number text,
  serial_number text,
  report_date date,
  manufacturer text,
  model text,
  ata_code text,
  ata_category text,
  component text,
  problem text,
  narrative_summary text,
  raw_narrative text,
  source_url text,
  source_loaded_at timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_sdr_n_number on sdr_records (n_number);
create index idx_sdr_report_date on sdr_records (report_date);
create index idx_sdr_ata_code on sdr_records (ata_code);
```

### `aircraft_signal_snapshots`

```sql
create table aircraft_signal_snapshots (
  id uuid primary key default gen_random_uuid(),
  n_number text not null,
  identity_confidence text not null,
  public_record_signal text not null,
  data_confidence text not null,
  key_findings jsonb not null,
  limitations jsonb not null,
  summary_text text not null,
  rules_version text not null,
  created_at timestamptz default now()
);

create index idx_signal_snapshots_n_number on aircraft_signal_snapshots (n_number);
```

---

## 22. Future ingestion strategy

Do not start here. This is the path after the curated demo works.

### 22.1 FAA registry ingestion

- Download FAA registry zip/file.
- Parse master file.
- Normalize N-number and serial.
- Upsert into `aircraft_registry`.
- Track loaded date and file version.

### 22.2 NTSB ingestion

- Download NTSB aviation dataset.
- Parse event and aircraft tables.
- Join aircraft-to-event.
- Normalize N-number and serial.
- Upsert records.
- Preserve raw event ID.
- Track data release version.

### 22.3 SDR ingestion

- Download SDR CSVs by year.
- Start with most recent 5–8 years.
- Normalize N-number.
- Normalize ATA code.
- Store raw narrative and summary.
- Group by aircraft and model.

### 22.4 Matching logic

Match priority:

1. N-number + serial number
2. serial number
3. N-number only
4. make/model + date context
5. ambiguous / do not assert

### 22.5 Data quality flags

For each match, store:

- `match_basis`,
- `match_confidence`,
- `source_last_refreshed`,
- `manual_review_required`,
- `notes`.

---

## 23. Testing plan

## 23.1 Unit tests

Test:

- N-number normalization,
- N-number validation,
- signal label calculation,
- SDR ATA grouping,
- source coverage counts,
- JSON schema validation.

## 23.2 UI tests

Use Playwright for:

- homepage loads,
- demo N-number search works,
- unknown N-number shows not-in-demo state,
- profile renders key sections,
- record drawer opens,
- mobile viewport renders cleanly.

## 23.3 Data QA tests

For each demo aircraft:

- source URL exists,
- source name exists,
- N-number normalized,
- summary does not use banned phrases,
- record counts match arrays,
- confidence labels valid.

### Banned phrase checks

Flag these phrases in summaries:

- “safe”
- “unsafe”
- “guaranteed”
- “complete maintenance history”
- “never crashed”
- “no issues”
- “airworthy”
- “certified safe”

Allow only in disclaimer contexts, such as:

> “This is not a determination that the aircraft is safe or unsafe.”

---

## 24. Demo script

### 24.1 Opening

> “This prototype shows how a consumer or aviation professional could enter a U.S. aircraft tail number and immediately see a public-records safety profile based on FAA, NTSB, and maintenance-defect datasets.”

### 24.2 Clean aircraft demo

Search Aircraft 1.

Point out:

- FAA identity match,
- no major public records found in searched datasets,
- limitation wording.

### 24.3 Accident-history demo

Search Aircraft 2.

Point out:

- NTSB record card,
- event severity,
- source traceability,
- elevated public-records signal.

### 24.4 SDR demo

Search Aircraft 3 or 4.

Point out:

- SDR records,
- ATA categories,
- repeated pattern,
- not overclaiming.

### 24.5 Close

> “This is intentionally not a safety oracle. It is a public-records intelligence layer. The next step is replacing the curated JSON with automated ingestion and adding photo-based tail-number capture.”

---

## 25. Key product risks

## 25.1 Legal / reliance risk

Risk:

- Users may rely on app as safety certification.

Mitigation:

- Avoid safety/unsafe claims.
- Use public-records language.
- Add disclaimers.
- Show sources.
- Show confidence and limitations.
- No numeric safety score at prototype stage.

## 25.2 Data completeness risk

Risk:

- Public datasets are incomplete.

Mitigation:

- Explain “searched datasets.”
- Include source coverage strip.
- Include data confidence label.
- Avoid “no records means no issues.”

## 25.3 Identity-matching risk

Risk:

- Tail numbers can be reassigned.
- Records may require serial-number matching.

Mitigation:

- Capture serial number.
- Store match basis.
- Show identity confidence.
- Use ambiguous data label where needed.

## 25.4 SDR interpretation risk

Risk:

- SDRs can be misunderstood as direct proof of current defects.

Mitigation:

- Say “public malfunction/defect report.”
- Group and summarize carefully.
- Do not claim unresolved issue.
- Avoid “this plane has a defect” unless record directly supports it.

## 25.5 Privacy / creepiness risk

Risk:

- App could drift into tracking individuals or celebrities.

Mitigation:

- Focus on aircraft safety records, not owner identity.
- Avoid celebrity/private owner demo examples.
- Avoid exposing home addresses or personal owner details.
- Consider suppressing owner fields entirely.

---

## 26. Acceptance criteria for v0

The v0 prototype is done when:

- [ ] There are at least 6 curated aircraft profiles.
- [ ] User can search by typed N-number.
- [ ] Unknown N-number shows a helpful not-in-demo state.
- [ ] Each profile shows aircraft identity.
- [ ] Each profile shows public-records signal.
- [ ] Each profile shows source coverage.
- [ ] NTSB records render when present.
- [ ] SDR records render when present.
- [ ] Empty states are clear and not overclaiming.
- [ ] Every record has a source label.
- [ ] Every profile has limitations.
- [ ] The app avoids unsafe/safe determinations.
- [ ] JSON validates.
- [ ] App deploys on Vercel.
- [ ] Demo can be completed in under 5 minutes.

---

## 27. MVP README copy

Suggested README opening:

```markdown
# Aircraft Public-Records Safety Profile Prototype

This prototype demonstrates a lightweight aircraft public-records lookup experience. Given a U.S. aircraft N-number, the app displays curated public records from FAA registration data, NTSB accident records, FAA Service Difficulty Reports, and optional FAA incident records.

The prototype is intentionally limited to a small curated demo pack. It does not determine whether an aircraft is safe, unsafe, or currently airworthy. It is designed to explore whether public aviation records can be combined into a useful, transparent, source-backed profile.
```

---

## 28. Immediate next actions

1. Create repo.
2. Add this build plan to `/docs/MVP_BUILD_PLAN.md`.
3. Create spreadsheet for the 6 demo aircraft.
4. Pick candidate tail numbers.
5. Collect FAA registry profiles.
6. Collect NTSB matches.
7. Collect SDR matches.
8. Convert spreadsheet to JSON.
9. Build search + profile UI.
10. Deploy demo.
11. Test with real users.
12. Decide whether to build full ingestion.

---

## 29. Recommended first implementation path

The fastest build path is:

```text
Day 1 equivalent:
- Create Next.js app
- Add static demo JSON
- Build search page
- Build profile page
- Render placeholder records

Day 2 equivalent:
- Collect 6 real aircraft profiles
- Replace placeholders with real curated data
- Add signal labels and source coverage

Day 3 equivalent:
- Polish UX
- Add detail drawers
- Add disclaimers
- Add tests
- Deploy to Vercel
```

Do not spend the first iteration on:

- Supabase,
- full ingestion,
- perfect scoring,
- flight tracking,
- AD matching,
- photo OCR.

The prototype should first answer:

> “Does this aircraft public-records profile feel valuable enough to justify building the real data platform?”

---

## 30. Final recommendation

Build the v0 prototype as a **curated public-records aircraft profile app**.

The killer demo is:

1. Search a clean aircraft.
2. Search one with an NTSB accident.
3. Search one with SDR maintenance-defect records.
4. Show that the app is transparent, source-backed, and careful with confidence.

That is the smallest build that can still feel real.
