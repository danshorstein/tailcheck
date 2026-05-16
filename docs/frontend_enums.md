# Frontend Enum Reference

TailCheck enrichment is deterministic and rule-based. These values are public-record classification labels, not official safety or airworthiness determinations.

## `summary.public_record_signal`

- `none_found`
- `low`
- `moderate`
- `elevated`
- `notable`

## `sdr.records[].safety_relevance`

- `low`
- `moderate`
- `potential`
- `high_concern`
- `unknown`

## `sdr.records[].severity_band`

- `routine`
- `serviceability`
- `notable`
- `high_concern`
- `unknown`

## `sdr.records[].operational_impact`

- `routine_maintenance`
- `serviceability`
- `dispatch_relevance`
- `takeoff_landing_relevance`
- `takeoff_interruption`
- `in_flight_relevance`
- `unknown`

## `sdr.records[].resolution_status`

- `corrective_action_recorded`
- `inspected_no_fault_found`
- `deferred_or_followup_required`
- `resolution_unclear`

## Common `sdr.records[].event_flags`

- `rejected_takeoff`
- `fire_or_overheat_indication`
- `smoke_or_fumes`
- `crack_or_structural_damage`
- `leak`
- `brake_or_directional_control`
- `emergency_equipment`
- `door_or_structure`
- `engine_or_pneumatic`
- `repeat_category_member`

## Required Disclaimer

`Public records only — not a complete maintenance history or FAA airworthiness determination.`
