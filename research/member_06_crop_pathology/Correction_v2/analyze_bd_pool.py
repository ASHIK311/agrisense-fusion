import json
import re

with open(r"F:\nasa project\Member 6\Correction_v2\candidate_papers.json", "r", encoding="utf-8") as f:
    c1 = json.load(f)

with open(r"F:\nasa project\Member 6\Correction_v2\targeted_papers.json", "r", encoding="utf-8") as f:
    c2 = json.load(f)

with open(r"F:\nasa project\Member 6\Correction_v2\targeted_bd_papers.json", "r", encoding="utf-8") as f:
    c3 = json.load(f)

all_papers = []
for source in [c1, c2, c3]:
    for k, v in source.items():
        for p in v:
            p["cat"] = k
            all_papers.append(p)

seen = set()
unique = []
for p in all_papers:
    doi = p.get("doi", "").lower().strip()
    if not doi or doi in seen:
        continue
    if "pwkb" in doi or "cabicompendium" in doi or "plantwise" in p.get("journal", "").lower():
        continue
    seen.add(doi)
    unique.append(p)

def check_bd(p):
    text = (p.get("title", "") + " " + p.get("journal", "") + " " + p.get("doi", "")).lower()
    return any(w in text for w in ["bangladesh", "bjar", "brj", "jbau", "bjb", "bari", "brri", "bau", "dhaka", "rajshahi", "mymensingh", "gazipur", "dinajpur"])

print(f"Total clean unique: {len(unique)}")
bd_total = sum(1 for p in unique if check_bd(p))
print(f"Total Bangladesh-specific: {bd_total}")

# Print breakdown by category
cats = ["Rice", "Wheat", "Maize", "Potato", "Tomato", "Mustard", "Pulses_Condiments", "Chili", "Lentil", "Onion"]
for cat in cats:
    cp = [p for p in unique if p["cat"] == cat]
    bd_cp = [p for p in cp if check_bd(p)]
    print(f"Category '{cat}': Total {len(cp)}, Bangladesh-specific: {len(bd_cp)}")
