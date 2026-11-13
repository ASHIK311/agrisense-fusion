import urllib.request
import urllib.parse
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def check_doi(doi):
    raw_doi = doi.replace("https://doi.org/", "").replace("http://doi.org/", "").strip()
    url = f"https://api.crossref.org/works/{urllib.parse.quote(raw_doi)}"
    req = urllib.request.Request(url, headers={"User-Agent": "mailto:fieldshift_auditor@nasa.spaceapps.org"})
    try:
        resp = urllib.request.urlopen(req, timeout=10, context=ctx)
        if resp.getcode() == 200:
            data = json.loads(resp.read().decode("utf-8"))["message"]
            title = data.get("title", [""])[0] if data.get("title") else ""
            year = data.get("issued", {}).get("date-parts", [[None]])[0][0]
            container = data.get("container-title", [""])[0] if data.get("container-title") else ""
            return True, title, year, container
        return False, f"Code {resp.getcode()}", None, None
    except Exception as e:
        return False, str(e), None, None

test_dois = [
    "10.1111/mpp.12386",       # Islam et al. Wheat blast
    "10.1186/s12915-016-0309-8", # Islam et al. BMC Biology Wheat blast
    "10.3329/brj.v28i1.86746",  # BRJ Rice blast
    "10.3329/bjar.v40i2.24560", # BJAR Lentil stemphylium
    "10.1007/s10681-023-03215-z",# Lentil stemphylium
    "10.1038/s41598-020-74072-4" # Nature Sci Rep
]

for d in test_dois:
    ok, t, y, j = check_doi(d)
    print(f"{d} -> OK={ok} | {y} | {j[:30]} | {t[:50]}")
