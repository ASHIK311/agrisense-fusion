import json
import urllib.request
import urllib.parse
import ssl
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Load all candidate files
all_candidates = []
files = [
    r"F:\nasa project\Member 6\Correction_v2\candidate_papers.json",
    r"F:\nasa project\Member 6\Correction_v2\targeted_papers.json",
    r"F:\nasa project\Member 6\Correction_v2\targeted_bd_papers.json"
]

for fpath in files:
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
        for crop_key, plist in data.items():
            for p in plist:
                p["assigned_crop"] = crop_key
                all_candidates.append(p)

print(f"Total raw candidates: {len(all_candidates)}")

# Clean and deduplicate by DOI
seen_dois = set()
unique_papers = []

for p in all_candidates:
    doi = p.get("doi", "").strip()
    title = p.get("title", "").strip()
    if not doi or not title:
        continue
    doi_lower = doi.lower()
    if doi_lower in seen_dois:
        continue
    if "pwkb" in doi_lower or "cabicompendium" in doi_lower or "plantwise" in p.get("journal", "").lower():
        continue
    
    seen_dois.add(doi_lower)
    unique_papers.append(p)

print(f"Unique papers after removing compendia & duplicates: {len(unique_papers)}")

# Let's inspect distribution by assigned crop
from collections import Counter
counts = Counter(p["assigned_crop"] for p in unique_papers)
print("Distribution by assigned crop:", counts)
