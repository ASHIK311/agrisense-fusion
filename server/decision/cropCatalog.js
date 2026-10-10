/**
 * AgriSense Fusion - Crop Catalog & Rotation Sequences
 * Focus: Northern Bangladesh (Barind Tract, Rajshahi, Rangpur, Bogura)
 * NASA Space Apps Challenge 2026: Field Shift
 */

const CROPS = {
  BORO_RICE: {
    code: 'BORO_RICE',
    name: 'Boro Rice (বোরো ধান)',
    scientificName: 'Oryza sativa (Boro)',
    season: 'Rabi / Dry (Dec - May)',
    durationDays: 140,
    waterDemandCategory: 'very_high',
    irrigationRequirementMm: 1100, // heavily reliant on groundwater deep tubewells
    soilHealthRating: 30, // continuous flooding causes soil compaction and hardpan
    heatResilienceRating: 50, // sensitive to early summer heat stress during flowering
    economicGrossMarginRating: 72, // staple, guaranteed market, but high diesel/electricity pumping cost
    nitrogenFixing: false,
    minPh: 5.0,
    maxPh: 7.5,
    kcMid: 1.20
  },
  T_AMAN_RICE: {
    code: 'T_AMAN_RICE',
    name: 'T. Aman Rice (রোপা আমন)',
    scientificName: 'Oryza sativa (Aman)',
    season: 'Kharif-2 / Monsoon (Jul - Nov)',
    durationDays: 125,
    waterDemandCategory: 'medium', // mostly rainfed in monsoon
    irrigationRequirementMm: 250,
    soilHealthRating: 55,
    heatResilienceRating: 70,
    economicGrossMarginRating: 68,
    nitrogenFixing: false,
    minPh: 5.5,
    maxPh: 7.5,
    kcMid: 1.15
  },
  MUSTARD: {
    code: 'MUSTARD',
    name: 'Mustard / Sarisha (সরিষা)',
    scientificName: 'Brassica juncea / B. napus',
    season: 'Early Rabi (Oct - Jan)',
    durationDays: 75,
    waterDemandCategory: 'low',
    irrigationRequirementMm: 120, // 1 to 2 light irrigations
    soilHealthRating: 70, // good biomass, deep taproot breaks hardpan
    heatResilienceRating: 65,
    economicGrossMarginRating: 82, // high oil value, short turnaround allows relay cropping
    nitrogenFixing: false,
    minPh: 6.0,
    maxPh: 7.5,
    kcMid: 1.05
  },
  MUNGBEAN: {
    code: 'MUNGBEAN',
    name: 'Mungbean / Mug Dal (মুগ ডাল)',
    scientificName: 'Vigna radiata',
    season: 'Kharif-1 / Pre-monsoon (Mar - Jun)',
    durationDays: 65,
    waterDemandCategory: 'low',
    irrigationRequirementMm: 100,
    soilHealthRating: 95, // fixes 30-40 kg atmospheric N/ha, green manure residues
    heatResilienceRating: 80, // heat tolerant
    economicGrossMarginRating: 78,
    nitrogenFixing: true,
    minPh: 6.0,
    maxPh: 7.2,
    kcMid: 0.95
  },
  LENTIL: {
    code: 'LENTIL',
    name: 'Lentil / Mosur Dal (মসুর ডাল)',
    scientificName: 'Lens culinaris',
    season: 'Rabi (Nov - Mar)',
    durationDays: 105,
    waterDemandCategory: 'low',
    irrigationRequirementMm: 80, // minimal irrigation, drought hardy
    soilHealthRating: 90, // biological nitrogen fixation
    heatResilienceRating: 75,
    economicGrossMarginRating: 84, // premium domestic pulse price
    nitrogenFixing: true,
    minPh: 6.0,
    maxPh: 7.8,
    kcMid: 1.00
  },
  MAIZE: {
    code: 'MAIZE',
    name: 'Maize / Bhutta (ভুট্টা)',
    scientificName: 'Zea mays',
    season: 'Rabi (Nov - Apr)',
    durationDays: 135,
    waterDemandCategory: 'medium',
    irrigationRequirementMm: 450, // uses ~60% less water than Boro rice
    soilHealthRating: 60,
    heatResilienceRating: 85, // C4 photosynthetic pathway, heat tolerant
    economicGrossMarginRating: 88, // high poultry feed demand in Bangladesh
    nitrogenFixing: false,
    minPh: 5.8,
    maxPh: 7.2,
    kcMid: 1.20
  },
  POTATO: {
    code: 'POTATO',
    name: 'Potato / Aloo (আলু)',
    scientificName: 'Solanum tuberosum',
    season: 'Rabi (Nov - Feb)',
    durationDays: 90,
    waterDemandCategory: 'medium',
    irrigationRequirementMm: 300,
    soilHealthRating: 62,
    heatResilienceRating: 40, // heat-sensitive during tuberization
    economicGrossMarginRating: 85, // high profit potential but volatile market price
    nitrogenFixing: false,
    minPh: 5.2,
    maxPh: 6.5,
    kcMid: 1.15
  },
  WHEAT: {
    code: 'WHEAT',
    name: 'Wheat / Gom (গম)',
    scientificName: 'Triticum aestivum',
    season: 'Rabi (Nov - Mar)',
    durationDays: 110,
    waterDemandCategory: 'low',
    irrigationRequirementMm: 220,
    soilHealthRating: 65,
    heatResilienceRating: 55, // vulnerable to terminal heat stress in late Feb/Mar
    economicGrossMarginRating: 70,
    nitrogenFixing: false,
    minPh: 6.0,
    maxPh: 7.5,
    kcMid: 1.10
  }
};

/**
 * Standard candidate crop rotation sequences in Northern Bangladesh
 */
const CANDIDATE_ROTATIONS = [
  {
    id: 'rot-legume-pulse-water-smart',
    name: 'Mustard → Mungbean → T. Aman (সরিষা → মুগ → আমন)',
    crops: ['MUSTARD', 'MUNGBEAN', 'T_AMAN_RICE'],
    cycleType: 'triple_crop_sustainable',
    description: 'Replaces water-depleting Boro rice with short-duration oilseed and legume. Drastic groundwater conservation in Barind aquifer.',
    pros: [
      'Reduces groundwater extraction by up to 65% compared to Boro monoculture',
      'Mungbean biological nitrogen fixation enriches soil and cuts chemical N fertilizer',
      'Continuous soil cover prevents dry-season crusting'
    ],
    cons: [
      'Requires timely sowing of mustard immediately after Aman harvest (by mid-November)',
      'Requires local market linkage for prompt pulse marketing'
    ],
    constraints: ['Mustard must be harvested by late January', 'Optimal soil drainage needed for mungbean'],
    warnings: ['Provisional recommendation: verify local market pulse prices and seed availability']
  },
  {
    id: 'rot-maize-mung-aman',
    name: 'Maize → Mungbean → T. Aman (ভুট্টা → মুগ → আমন)',
    crops: ['MAIZE', 'MUNGBEAN', 'T_AMAN_RICE'],
    cycleType: 'triple_crop_feed_grain',
    description: 'Diversified cereal-legume rotation with high commercial return from poultry feed maize.',
    pros: [
      'Uses 50% less irrigation water than Boro rice with significantly higher gross margin',
      'C4 crop (maize) offers high heat resilience in late dry season',
      'Residues provide excellent biomass for soil organic carbon'
    ],
    cons: [
      'Heavy nutrient uptake by maize requires balanced basal organic compost application',
      'Longer duration can tighten Aman transplanting window'
    ],
    constraints: ['Ensure minimum 65 days for mungbean maturation before monsoon onset'],
    warnings: ['Provisional recommendation: monitor armyworm pressure in maize']
  },
  {
    id: 'rot-lentil-aman',
    name: 'Lentil → Aus Rice → T. Aman (মসুর → আউশ → আমন)',
    crops: ['LENTIL', 'T_AMAN_RICE'],
    cycleType: 'drought_resilient_pulse',
    description: 'Drought-hardy pulse system with minimal supplementary irrigation requirement.',
    pros: [
      'Lowest total water consumption among all evaluated patterns (<150 mm irrigation)',
      'High protein food crop with premium domestic market value',
      'Improves soil microbial diversity through Rhizobium nodulation'
    ],
    cons: [
      'Lentil is sensitive to waterlogging during unexpected winter rains',
      'Lower total grain yield volume compared to maize or hybrid rice'
    ],
    constraints: ['Well-drained silty loam or sandy loam soil required'],
    warnings: ['Provisional recommendation: do not plant in low-lying land prone to stagnant water']
  },
  {
    id: 'rot-potato-mung-aman',
    name: 'Potato → Mungbean → T. Aman (আলু → মুগ → আমন)',
    crops: ['POTATO', 'MUNGBEAN', 'T_AMAN_RICE'],
    cycleType: 'high_value_commercial',
    description: 'High-value horticulture and cash crop pattern with rapid economic payback.',
    pros: [
      'High economic return per hectare during favorable market years',
      'Potato tubers leave loose, friable soil structure for subsequent mungbean',
      'Mungbean utilizes residual soil moisture and fertilizer from potato'
    ],
    cons: [
      'High upfront capital required for certified seed potatoes and cold storage',
      'Potato is sensitive to early warm spells (heat stress above 28°C limits tuber bulking)'
    ],
    constraints: ['Cold storage access within 25 km is critical', 'Soil pH must remain below 6.5 to avoid scab disease'],
    warnings: ['Provisional recommendation: high capital exposure to potato market price volatility']
  },
  {
    id: 'rot-mustard-boro-aman',
    name: 'Mustard → Boro Rice → T. Aman (সরিষা → বোরো → আমন)',
    crops: ['MUSTARD', 'BORO_RICE', 'T_AMAN_RICE'],
    cycleType: 'intensified_traditional',
    description: 'Intensified traditional pattern; adds cash crop mustard before standard Boro rice.',
    pros: [
      'Adds supplementary oilseed cash flow before main rice season',
      'Familiar technology and agronomic practices for local farmers'
    ],
    cons: [
      'Extreme groundwater strain: Boro rice requires 35-45 tubewell irrigations',
      'Continuous wet/dry cycles degrade soil structure and deplete organic matter',
      'Elevated electricity/diesel pumping costs erode net margins'
    ],
    constraints: ['Requires reliable deep tubewell groundwater irrigation capacity'],
    warnings: ['High groundwater depletion alert: Not sustainable in Barind Red Alert zones']
  },
  {
    id: 'rot-boro-fallow-aman',
    name: 'Boro Rice → Fallow → T. Aman (বোরো → পতিত → আমন)',
    crops: ['BORO_RICE', 'T_AMAN_RICE'],
    cycleType: 'monoculture_baseline',
    description: 'Conventional baseline rice-rice pattern in Northern Bangladesh with summer fallow.',
    pros: [
      'Staple food security with established government procurement',
      'Zero new crop knowledge required'
    ],
    cons: [
      'Severe groundwater overdraft causing water table decline of up to 0.75m/year in Barind',
      'Bare fallow during pre-monsoon increases soil surface evaporation and erosion',
      'Low soil organic matter and persistent nitrogen leaching'
    ],
    constraints: ['Heavy clay or puddled soil'],
    warnings: ['Critical Water Depletion: Accelerates regional aquifer exhaustion']
  }
];

module.exports = {
  CROPS,
  CANDIDATE_ROTATIONS
};
