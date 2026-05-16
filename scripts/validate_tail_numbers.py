from __future__ import annotations

import requests

BASE_URL = "http://localhost:8000"
TAILS = ["N100", "N10000"]

for tail in TAILS:
    resp = requests.get(f"{BASE_URL}/api/v1/aircraft/{tail}/profile", timeout=30)
    print(tail, resp.status_code)
    print(resp.json())
