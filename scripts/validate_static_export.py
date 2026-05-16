from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.services.normalization import normalize_n_number
from scripts.export_static_profiles import shard_key, shard_relative_path


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def directory_size(path: Path) -> int:
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file())


def human_bytes(size: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.1f} {unit}"
        value /= 1024
    return f"{size} B"


def lookup_profile(
    data_dir: Path,
    n_number: str,
    shard_length: int,
    shard_directory_length: int,
) -> dict[str, Any] | None:
    normalized = normalize_n_number(n_number)
    if not normalized:
        return None
    key = shard_key(normalized, shard_length)
    shard_path = data_dir / "profiles" / shard_relative_path(key, shard_directory_length)
    if not shard_path.exists():
        return None
    return load_json(shard_path).get(normalized)


def validate_static_export(data_dir: Path, samples: list[str]) -> dict[str, Any]:
    manifest_path = data_dir / "manifest.json"
    profiles_dir = data_dir / "profiles"
    if not manifest_path.exists():
        raise AssertionError(f"Missing manifest: {manifest_path}")
    if not profiles_dir.exists():
        raise AssertionError(f"Missing profiles directory: {profiles_dir}")

    manifest = load_json(manifest_path)
    shard_length = int(manifest.get("shard_length", 2))
    shard_directory_length = int(manifest.get("shard_directory_length", 0))
    expected_shards = set(manifest.get("shards", []))
    actual_shards = {path.stem for path in profiles_dir.rglob("*.json")}
    if expected_shards != actual_shards:
        missing = sorted(expected_shards - actual_shards)
        extra = sorted(actual_shards - expected_shards)
        raise AssertionError(f"Shard mismatch. missing={missing[:10]} extra={extra[:10]}")

    profile_count = 0
    records_bearing_count = 0
    largest_shard = ("", 0)
    for path in sorted(profiles_dir.rglob("*.json")):
        payload = load_json(path)
        if not isinstance(payload, dict):
            raise AssertionError(f"Shard is not an object: {path}")
        profile_count += len(payload)
        records_bearing_count += sum(
            1
            for profile in payload.values()
            if profile.get("sdr", {}).get("records_found", 0)
            or profile.get("ntsb", {}).get("records_found", 0)
        )
        if path.stat().st_size > largest_shard[1]:
            largest_shard = (path.name, path.stat().st_size)

    if profile_count != manifest.get("profile_count"):
        raise AssertionError(
            f"profile_count mismatch: manifest={manifest.get('profile_count')} actual={profile_count}"
        )

    sample_results = {}
    for sample in samples:
        profile = lookup_profile(data_dir, sample, shard_length, shard_directory_length)
        if not profile:
            raise AssertionError(f"Sample lookup failed: {sample}")
        sample_results[sample] = {
            "n_number": profile.get("n_number"),
            "manufacturer": profile.get("identity", {}).get("manufacturer"),
            "model": profile.get("identity", {}).get("model"),
            "sdr_records_found": profile.get("sdr", {}).get(
                "records_found", profile.get("summary", {}).get("sdr_records_found")
            ),
            "ntsb_records_found": profile.get("ntsb", {}).get(
                "records_found", profile.get("summary", {}).get("ntsb_records_found")
            ),
        }

    report = {
        "data_dir": str(data_dir),
        "schema_version": manifest.get("schema_version"),
        "generated_at": manifest.get("generated_at"),
        "shard_length": shard_length,
        "shard_directory_length": shard_directory_length,
        "profile_count": profile_count,
        "records_bearing_profile_count": records_bearing_count,
        "shard_count": len(actual_shards),
        "total_size": human_bytes(directory_size(data_dir)),
        "largest_shard": {
            "file": largest_shard[0],
            "size": human_bytes(largest_shard[1]),
        },
        "samples": sample_results,
    }
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate TailCheck static export.")
    parser.add_argument("--data-dir", default="frontend/public/data")
    parser.add_argument("--samples", nargs="*", default=["N100", "N10000", "N62849"])
    args = parser.parse_args()

    report = validate_static_export(Path(args.data_dir), args.samples)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
