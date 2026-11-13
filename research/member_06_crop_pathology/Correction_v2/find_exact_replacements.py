import json
import urllib.request
import urllib.parse
import ssl
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def check_doi_online(doi):
    raw = doi.replace("https://doi.org/", "").replace("http://doi.org/", "").strip()
    url = f"https://api.crossref.org/works/{urllib.parse.quote(raw)}"
    req = urllib.request.Request(url, headers={"User-Agent": "mailto:fieldshift_auditor@nasa.spaceapps.org"})
    try:
        resp = urllib.request.urlopen(req, timeout=5, context=ctx)
        return resp.getcode() == 200
    except:
        return False

# Load unique candidates from earlier
with open(r"F:\nasa project\Member 6\Correction_v2\candidate_papers.json", "r", encoding="utf-8") as f:
    c1 = json.load(f)
with open(r"F:\nasa project\Member 6\Correction_v2\targeted_papers.json", "r", encoding="utf-8") as f:
    c2 = json.load(f)
with open(r"F:\nasa project\Member 6\Correction_v2\targeted_bd_papers.json", "r", encoding="utf-8") as f:
    c3 = json.load(f)

all_cands = []
for src in [c1, c2, c3]:
    for cat, plist in src.items():
        for p in plist:
            p["cat"] = cat
            all_cands.append(p)

# Filter valid candidates with CrossRef confirmed DOIs
print("Filtering candidates...")
for crop in ["Rice", "Wheat", "Maize", "Potato"]:
    pool = [p for p in all_cands if p.get("cat") == crop and "pwkb" not in p.get("doi", "").lower() and "cabicompendium" not in p.get("doi", "").lower()]
    print(f"\n--- Candidates for {crop} (total {len(pool)}) ---")
    tested = 0
    valid_found = []
    for p in pool:
        doi = p.get("doi", "")
        if not doi: continue
        if check_doi_online(doi):
            valid_found.append(p)
            print(f"  [VALID] {doi} | {p.get('year')} | {p.get('title')[:65]}")
            if len(valid_found) >= 10:
                break
        time.sleep(0.1)

print("\nDone testing candidate replacements.")
