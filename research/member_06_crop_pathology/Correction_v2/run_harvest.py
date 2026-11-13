import sys
sys.path.append(r"F:\nasa project\Member 6\Correction_v2")
from harvest_verified_papers import query_crossref
import json
import time

searches = {
    "Rice": [
        ("rice blast Pyricularia oryzae Bangladesh", ["rice", "blast", "Bangladesh", "oryzae"]),
        ("rice blast Magnaporthe oryzae Bangladesh BRRI", ["blast", "rice", "Bangladesh"]),
        ("Xanthomonas oryzae bacterial blight rice Bangladesh", ["bacterial", "blight", "rice", "Bangladesh"]),
        ("Rhizoctonia solani sheath blight rice Bangladesh", ["sheath", "blight", "rice", "Bangladesh"]),
        ("Ustilaginoidea virens false smut rice Bangladesh", ["false smut", "rice", "Bangladesh", "virens"]),
        ("rice tungro virus Bangladesh", ["tungro", "rice", "Bangladesh"]),
        ("Bipolaris oryzae brown spot rice Bangladesh", ["brown spot", "rice", "Bangladesh", "bipolaris"]),
        ("Fusarium fujikuroi bakanae rice Bangladesh", ["bakanae", "rice", "Bangladesh"]),
        ("rice neck blast resistance BRRI Bangladesh", ["rice", "blast", "BRRI", "resistance"]),
        ("rice disease surveillance epidemiology Bangladesh", ["rice", "disease", "Bangladesh"])
    ],
    "Wheat": [
        ("wheat blast Magnaporthe oryzae Triticum Bangladesh", ["wheat", "blast", "Bangladesh"]),
        ("wheat blast 2NS translocation BARI Gom 33 Bangladesh", ["wheat", "blast", "Bangladesh", "2NS"]),
        ("Bipolaris sorokiniana spot blotch wheat Bangladesh", ["wheat", "bipolaris", "blight", "Bangladesh", "spot blotch"]),
        ("Puccinia triticina leaf rust wheat Bangladesh", ["wheat", "rust", "Bangladesh", "puccinia"]),
        ("wheat disease epidemiology BARI Bangladesh", ["wheat", "disease", "Bangladesh", "BARI"])
    ],
    "Maize": [
        ("Bipolaris maydis maize Bangladesh", ["maize", "maydis", "Bangladesh", "corn"]),
        ("Rhizoctonia solani banded leaf sheath blight maize Bangladesh", ["maize", "sheath blight", "banded", "Bangladesh"]),
        ("Exserohilum turcicum turcicum leaf blight maize Bangladesh", ["maize", "turcicum", "leaf blight", "Bangladesh"]),
        ("maize disease survey hybrid BARI Bangladesh", ["maize", "disease", "Bangladesh", "corn"]),
        ("Fusarium stalk rot maize Bangladesh", ["maize", "stalk rot", "Fusarium", "Bangladesh"])
    ],
    "Potato": [
        ("potato late blight Phytophthora infestans Bangladesh", ["potato", "late blight", "infestans", "Bangladesh"]),
        ("Ralstonia solanacearum bacterial wilt potato Bangladesh", ["potato", "bacterial wilt", "Ralstonia", "Bangladesh"]),
        ("potato early blight Alternaria solani Bangladesh", ["potato", "early blight", "Alternaria", "Bangladesh"]),
        ("potato virus PLRV PVY Bangladesh BARI", ["potato", "virus", "Bangladesh", "BARI"])
    ],
    "Tomato": [
        ("tomato yellow leaf curl virus TYLCV Bangladesh", ["tomato", "leaf curl", "virus", "Bangladesh", "TYLCV"]),
        ("tomato early blight Alternaria solani Bangladesh", ["tomato", "early blight", "Alternaria", "Bangladesh"]),
        ("tomato bacterial wilt Ralstonia solanacearum Bangladesh", ["tomato", "bacterial wilt", "Ralstonia", "Bangladesh"]),
        ("tomato late blight Phytophthora infestans Bangladesh", ["tomato", "late blight", "Bangladesh"])
    ],
    "Mustard": [
        ("Alternaria brassicae blight mustard Bangladesh", ["mustard", "alternaria", "blight", "Bangladesh", "rapeseed"]),
        ("Sclerotinia sclerotiorum white rot mustard Bangladesh", ["mustard", "sclerotinia", "Bangladesh", "rapeseed"]),
        ("mustard disease management BARI Bangladesh", ["mustard", "disease", "Bangladesh", "BARI"])
    ],
    "Pulses_Condiments": [
        ("lentil Stemphylium blight botryosum Bangladesh", ["lentil", "stemphylium", "blight", "Bangladesh"]),
        ("lentil rust Uromyces viciae-fabae Bangladesh", ["lentil", "rust", "Bangladesh"]),
        ("lentil wilt Fusarium oxysporum Bangladesh", ["lentil", "wilt", "fusarium", "Bangladesh"]),
        ("chili anthracnose Colletotrichum Bangladesh", ["chili", "chilli", "anthracnose", "colletotrichum", "Bangladesh"]),
        ("onion purple blotch Alternaria porri Bangladesh", ["onion", "purple blotch", "alternaria", "Bangladesh"])
    ]
}

harvested = {}
total_collected = 0

for crop, query_list in searches.items():
    harvested[crop] = []
    seen_dois = set()
    print(f"\n--- Searching for {crop} ---")
    for q, kw in query_list:
        results = query_crossref(q, filter_kw=kw, max_results=15)
        for r in results:
            doi = r["doi"]
            if doi not in seen_dois:
                seen_dois.add(doi)
                harvested[crop].append(r)
        time.sleep(0.3)
    print(f"Collected {len(harvested[crop])} candidate papers for {crop}")
    total_collected += len(harvested[crop])

print(f"\nTotal candidate papers collected: {total_collected}")
with open(r"F:\nasa project\Member 6\Correction_v2\candidate_papers.json", "w", encoding="utf-8") as f:
    json.dump(harvested, f, indent=2, ensure_ascii=False)
print("Saved candidate_papers.json")
