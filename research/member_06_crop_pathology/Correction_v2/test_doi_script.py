import json
import urllib.request
import urllib.parse
import ssl
import time
import os

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def verify_doi_online(doi):
    raw = doi.replace("https://doi.org/", "").replace("http://doi.org/", "").strip()
    url = f"https://api.crossref.org/works/{urllib.parse.quote(raw)}"
    req = urllib.request.Request(url, headers={"User-Agent": "mailto:fieldshift_auditor@nasa.spaceapps.org"})
    try:
        resp = urllib.request.urlopen(req, timeout=8, context=ctx)
        if resp.getcode() == 200:
            return True, "CrossRef Verified"
        return False, f"HTTP {resp.getcode()}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}"
    except Exception as e:
        return False, str(e)

print("Verifier ready.")
