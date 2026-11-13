import json

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

def is_bd(p):
    text = (p.get("title", "") + " " + p.get("journal", "") + " " + p.get("doi", "")).lower()
    return any(w in text for w in ["bangladesh", "bjar", "brj", "jbau", "bjb", "bari", "brri", "bau", "dhaka", "rajshahi", "mymensingh", "gazipur", "dinajpur"])

# Let's inspect by crop
for crop in ["Potato", "Tomato", "Mustard", "Pulses_Condiments", "Chili", "Lentil", "Wheat", "Maize", "Rice"]:
    print(f"\n=================== {crop} ===================")
    cp = [p for p in unique if p["cat"] == crop or (crop in ["Chili", "Lentil"] and p["cat"] == "Pulses_Condiments")]
    # Sort Bangladesh first, then by year desc
    cp.sort(key=lambda x: (is_bd(x), x.get("year", 0)), reverse=True)
    for i, p in enumerate(cp[:12]):
        bd_tag = "[BD]" if is_bd(p) else "[INT]"
        print(f"  {i+1}. {bd_tag} ({p.get('year')}) {p.get('title')[:75]} | {p.get('journal')[:30]} | {p.get('doi')}")
