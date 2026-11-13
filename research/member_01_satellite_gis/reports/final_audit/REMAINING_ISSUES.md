# Field Shift — Member 1 Satellite GIS: Remaining Technical Issues & Blockers
**NASA Space Apps Challenge 2026**  
**Transparent Disclosure of Current Limitations and Actionable Roadmap**  

---

## 1. Itemized Status & Blocker Catalog

| Issue ID | Module | Description | Severity | Current Status | Required Action / Owner |
|:---:|:---|:---|:---:|:---:|:---|
| **ISS-01** | **Ground Truth** | Parcel-level crop species labels (Rice/Wheat/Maize) missing | **HIGH** | **BLOCKED** | Conduct 1,200-parcel DAE field survey per `data/labels/ground_truth_schema.md` |
| **ISS-02** | **SAR Remote Sensing** | Optical cloud cover obscures Kharif monsoon Aman rice | **MEDIUM** | **PLANNED** | Ingest Sentinel-1 dual-pol SAR GRD backscatter time series |
| **ISS-03** | **GIS Boundaries** | Sub-village (Mouza) cadastral parcel vectors missing | **MEDIUM** | **PLANNED** | Request DLRS cadastral Mouza GIS shapefiles from Ministry of Land |
| **ISS-04** | **Hydrology** | In-situ piezometric groundwater tubewell logs not digitized | **LOW** | **PLANNED** | Ingest BMDA weekly deep tubewell water table depth monitoring logs |

## 2. Mitigations & Operational Status
* While fine-grained crop species is blocked, the operational Land Cover classifier reliably delineates Cropland boundaries (353.87 km²) with 79.77% spatial accuracy, allowing the Field Shift platform to compute aggregate biomass stress, moisture deficit, and tubewell pumping risks immediately.
