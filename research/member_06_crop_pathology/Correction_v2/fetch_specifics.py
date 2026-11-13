import urllib.request
import urllib.parse
import ssl
import json
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def query_crossref(query, rows=10):
    url = f"https://api.crossref.org/works?query={urllib.parse.quote(query)}&rows={rows}"
    req = urllib.request.Request(url, headers={"User-Agent": "mailto:fieldshift_scholar@nasa.spaceapps.org"})
    try:
        resp = urllib.request.urlopen(req, timeout=12, context=ctx)
        items = json.loads(resp.read().decode("utf-8"))["message"]["items"]
        out = []
        for it in items:
            doi = it.get("DOI", "")
            title = it.get("title", [""])[0] if it.get("title") else ""
            container = it.get("container-title", [""])[0] if it.get("container-title") else ""
            year = it.get("issued", {}).get("date-parts", [[None]])[0][0]
            if "cabicompendium" in doi or "pwkb" in doi:
                continue
            if not doi or not title or not year:
                continue
            authors_list = []
            for a in it.get("author", []):
                fam = a.get("family", "")
                giv = a.get("given", "")
                if fam and giv:
                    authors_list.append(f"{fam}, {giv[0]}.")
                elif fam:
                    authors_list.append(fam)
            authors = "; ".join(authors_list[:4])
            out.append({
                "title": title,
                "authors": authors,
                "year": int(year),
                "journal": container,
                "doi": f"https://doi.org/{doi}",
                "raw_doi": doi
            })
        return out
    except Exception as e:
        print(f"Error: {e}")
        return []

specific_searches = {
    "Potato_Wilt_BD": "Ralstonia solanacearum potato Bangladesh",
    "Potato_LateBlight_BD": "Phytophthora infestans potato late blight Bangladesh BARI",
    "Chili_Anthracnose_BD": "Colletotrichum chili anthracnose Bangladesh BJAR",
    "Onion_PurpleBlotch_BD": "Alternaria porri onion purple blotch Bangladesh",
    "Lentil_Rust_Wilt_BD": "lentil rust Uromyces Fusarium wilt Bangladesh",
    "Maize_BLSB_BD": "Rhizoctonia solani banded leaf sheath blight maize",
    "Wheat_SpotBlotch_BD": "Bipolaris sorokiniana spot blotch wheat Bangladesh"
}

results = {}
for name, q in specific_searches.items():
    res = query_crossref(q, rows=8)
    print(f"\n--- {name} (query: {q}) ---")
    for r in res[:4]:
        print(f"  {r['year']} | {r['doi']} | {r['journal'][:30]} | {r['title'][:65]}")
    results[name] = res
    time.sleep(0.3)

with open(r"F:\nasa project\Member 6\Correction_v2\specific_matches.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
