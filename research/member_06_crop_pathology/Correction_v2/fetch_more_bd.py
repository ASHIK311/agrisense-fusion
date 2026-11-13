import urllib.request
import urllib.parse
import ssl
import json
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def search_crossref(query, rows=15):
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
            if len(it.get("author", [])) > 4:
                authors += " et al."
            out.append({
                "title": title,
                "authors": authors,
                "year": int(year),
                "journal": container,
                "doi": f"https://doi.org/{doi}",
                "raw_doi": doi,
                "is_bd": ("bangladesh" in title.lower() or "bangladesh" in container.lower() or "10.3329" in doi)
            })
        return out
    except Exception as e:
        print(f"Error {query}: {e}")
        return []

more_queries = [
    ("Potato", "potato late blight Bangladesh Phytophthora infestans"),
    ("Potato", "potato bacterial wilt Bangladesh Ralstonia solanacearum"),
    ("Potato", "potato disease survey Bangladesh BARI"),
    ("Tomato", "tomato leaf curl virus Bangladesh BARI"),
    ("Tomato", "tomato bacterial wilt Bangladesh Ralstonia"),
    ("Tomato", "tomato early blight Alternaria solani Bangladesh BAU"),
    ("Tomato", "tomato disease management Bangladesh"),
    ("Chili", "chilli anthracnose Colletotrichum Bangladesh BARI"),
    ("Chili", "chili fruit rot Colletotrichum capsici Bangladesh"),
    ("Maize", "maize disease Bangladesh BARI hybrid"),
    ("Maize", "maize banded leaf sheath blight Rhizoctonia Bangladesh"),
    ("Maize", "turcicum leaf blight maize Bangladesh BARI")
]

results = {}
for crop, q in more_queries:
    res = search_crossref(q, rows=15)
    print(f"{crop} | '{q}' -> found {len(res)} (BD: {sum(1 for r in res if r['is_bd'])})")
    if crop not in results:
        results[crop] = []
    results[crop].extend(res)
    time.sleep(0.3)

with open(r"F:\nasa project\Member 6\Correction_v2\targeted_bd_papers.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print("Saved targeted_bd_papers.json")
