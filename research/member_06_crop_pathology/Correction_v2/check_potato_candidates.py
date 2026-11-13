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

with open(r"F:\nasa project\Member 6\Correction_v2\targeted_bd_papers.json", "r", encoding="utf-8") as f:
    c3 = json.load(f)

print("Checking potato candidates in targeted_bd_papers:")
for p in c3.get("Potato", []):
    doi = p.get("doi", "")
    if doi and check_doi_online(doi):
        print(f"  [POTATO VALID] {doi} | {p.get('year')} | {p.get('title')[:65]}")
