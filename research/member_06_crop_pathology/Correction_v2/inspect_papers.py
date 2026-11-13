import json
import re

with open(r"F:\nasa project\Member 6\Correction_v2\candidate_papers.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for crop, papers in data.items():
    print(f"=== {crop} (Total {len(papers)}) ===")
    bd_papers = [p for p in papers if "bangladesh" in p["title"].lower() or "bangladesh" in p.get("journal", "").lower()]
    print(f"  Explicit Bangladesh mentions: {len(bd_papers)}")
    for i, p in enumerate(papers[:5]):
        print(f"  [{i+1}] {p['year']} | {p['doi']} | {p['title'][:65]}")
