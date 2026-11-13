import urllib.request
import urllib.parse
import ssl
import json
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def search_crossref_topic(query, rows=20):
    url = f"https://api.crossref.org/works?query={urllib.parse.quote(query)}&rows={rows}"
    req = urllib.request.Request(url, headers={"User-Agent": "mailto:fieldshift_auditor@nasa.spaceapps.org"})
    try:
        resp = urllib.request.urlopen(req, timeout=12, context=ctx)
        data = json.loads(resp.read().decode("utf-8"))
        items = data["message"]["items"]
        valid = []
        for it in items:
            doi = it.get("DOI", "")
            title = it.get("title", [""])[0] if it.get("title") else ""
            container = it.get("container-title", [""])[0] if it.get("container-title") else ""
            year = it.get("issued", {}).get("date-parts", [[None]])[0][0]
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
            
            # Avoid compendia / factsheets
            if "cabicompendium" in doi or "pwkb" in doi or "plantwise" in container.lower():
                continue
            if not title or not doi or not year:
                continue
            
            valid.append({
                "title": title,
                "authors": authors if authors else "Author Unknown",
                "year": int(year),
                "journal": container if container else "Academic Publication",
                "doi": f"https://doi.org/{doi}",
                "raw_doi": doi
            })
        return valid
    except Exception as e:
        print(f"Error: {e}")
        return []

# Test queries for Bangladesh crop diseases
queries = [
    ("Potato", "Ralstonia solanacearum bacterial wilt potato Bangladesh"),
    ("Potato", "Phytophthora infestans potato late blight Bangladesh"),
    ("Tomato", "Ralstonia solanacearum tomato wilt Bangladesh"),
    ("Tomato", "tomato yellow leaf curl virus Bangladesh"),
    ("Tomato", "Alternaria solani tomato early blight Bangladesh"),
    ("Mustard", "Alternaria brassicae mustard Bangladesh"),
    ("Mustard", "Sclerotinia sclerotiorum mustard Bangladesh BARI"),
    ("Maize", "Bipolaris maydis maize leaf blight Bangladesh"),
    ("Maize", "Rhizoctonia solani banded leaf sheath blight maize Bangladesh"),
    ("Lentil", "Stemphylium botryosum lentil blight Bangladesh BARI"),
    ("Chili", "Colletotrichum capsici anthracnose chilli Bangladesh"),
    ("Onion", "Alternaria porri onion purple blotch Bangladesh")
]

all_res = {}
for crop, q in queries:
    res = search_crossref_topic(q, rows=10)
    print(f"Query: '{q}' -> found {len(res)} papers")
    if crop not in all_res:
        all_res[crop] = []
    all_res[crop].extend(res)
    time.sleep(0.3)

with open(r"F:\nasa project\Member 6\Correction_v2\targeted_papers.json", "w", encoding="utf-8") as f:
    json.dump(all_res, f, indent=2, ensure_ascii=False)
print("Saved targeted_papers.json")
