import json
import re

candidates = {}
with open(r"F:\nasa project\Member 6\Correction_v2\candidate_papers.json", "r", encoding="utf-8") as f:
    c1 = json.load(f)
    for k, v in c1.items():
        candidates[k] = list(v)

with open(r"F:\nasa project\Member 6\Correction_v2\targeted_papers.json", "r", encoding="utf-8") as f:
    c2 = json.load(f)
    for k, v in c2.items():
        if k not in candidates:
            candidates[k] = []
        candidates[k].extend(v)

# Filter out compendia, factsheets, and non-peer reviewed / irrelevancies
def clean_papers(paper_list):
    seen_dois = set()
    cleaned = []
    for p in paper_list:
        doi = p.get("doi", "")
        title = p.get("title", "")
        j = p.get("journal", "")
        if not doi or not title:
            continue
        if doi in seen_dois:
            continue
        seen_dois.add(doi)
        
        # reject cabi compendia, plantwise factsheets, non-pathology topics
        low_t = title.lower()
        low_d = doi.lower()
        low_j = j.lower()
        if "pwkb" in low_d or "cabicompendium" in low_d or "plantwise" in low_j:
            continue
        if "data paper" in low_t or "genome sequence" in low_t and "complete" in low_t:
            pass # genomic papers are okay if relevant
        
        is_bd = "bangladesh" in low_t or "bangladesh" in low_j or "bjar" in low_d or "brj" in low_d or "jbau" in low_d
        p["is_bd"] = is_bd
        cleaned.append(p)
    return cleaned

for crop, plist in candidates.items():
    cleaned = clean_papers(plist)
    bd_count = sum(1 for p in cleaned if p["is_bd"])
    print(f"Crop {crop}: {len(cleaned)} valid academic papers (Bangladesh-specific: {bd_count})")
