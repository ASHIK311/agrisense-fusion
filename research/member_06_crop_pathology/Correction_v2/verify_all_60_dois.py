import json
import urllib.request
import urllib.parse
import ssl
import time
import socket
import sys

socket.setdefaulttimeout(5.0)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

from test_60_papers import papers_data

def check_doi_online(doi):
    raw = doi.replace("https://doi.org/", "").replace("http://doi.org/", "").strip()
    url = f"https://api.crossref.org/works/{urllib.parse.quote(raw)}"
    req = urllib.request.Request(url, headers={"User-Agent": "mailto:fieldshift_auditor@nasa.spaceapps.org"})
    try:
        resp = urllib.request.urlopen(req, timeout=5, context=ctx)
        if resp.getcode() == 200:
            return True, "CrossRef 200 OK"
        return False, f"HTTP {resp.getcode()}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}"
    except Exception as e:
        return False, str(e)

verified_records = []
failures = []

print(f"Starting online verification of {len(papers_data)} DOIs...", flush=True)
for i, p in enumerate(papers_data):
    doi = p["doi_or_url"]
    ok, msg = check_doi_online(doi)
    rec = dict(p)
    rec["online_check_pass"] = ok
    rec["online_check_msg"] = msg
    verified_records.append(rec)
    if not ok:
        failures.append((p["paper_id"], doi, msg))
        print(f"[{i+1}/{len(papers_data)}] FAIL: {p['paper_id']} | {doi} | {msg}", flush=True)
    else:
        print(f"[{i+1}/{len(papers_data)}] PASS: {p['paper_id']} | {doi}", flush=True)
    time.sleep(0.15)

with open(r"F:\nasa project\Member 6\Correction_v2\doi_verification_results.json", "w", encoding="utf-8") as f:
    json.dump(verified_records, f, indent=2, ensure_ascii=False)

print(f"\nCompleted: {len(papers_data) - len(failures)} PASS, {len(failures)} FAIL", flush=True)
