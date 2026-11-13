import urllib.request
import ssl
import json
import urllib.parse
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def query_crossref(query, filter_kw=None, max_results=10):
    q = urllib.parse.quote(query)
    url = f"https://api.crossref.org/works?query={q}&rows={max_results}"
    req = urllib.request.Request(url, headers={"User-Agent": "mailto:fieldshift_scholar@nasa.spaceapps.org"})
    try:
        resp = urllib.request.urlopen(req, timeout=12, context=ctx)
        data = json.loads(resp.read().decode("utf-8"))["message"]["items"]
        out = []
        for item in data:
            title = item.get("title", [""])[0] if item.get("title") else ""
            doi = item.get("DOI", "")
            container = item.get("container-title", [""])[0] if item.get("container-title") else ""
            year = item.get("issued", {}).get("date-parts", [[None]])[0][0]
            authors_list = []
            for a in item.get("author", []):
                family = a.get("family", "")
                given = a.get("given", "")
                if family and given:
                    authors_list.append(f"{family}, {given[0]}.")
                elif family:
                    authors_list.append(family)
            authors = "; ".join(authors_list[:5])
            if len(item.get("author", [])) > 5:
                authors += " et al."
            
            # Check filter
            combined = (title + " " + container).lower()
            if filter_kw and not any(kw.lower() in combined for kw in filter_kw):
                continue
            if title and doi and container and year:
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
        print(f"Error querying CrossRef for '{query}': {e}")
        return []

print("CrossRef query helper defined.")
