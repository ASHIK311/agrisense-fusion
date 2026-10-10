/**
 * AgriSense Fusion - Deterministic Multi-Criteria Crop-Rotation Scoring Engine
 * Aligned with NASA Space Apps 2026: Field Shift & Technical Blueprint
 */

const { CROPS, CANDIDATE_ROTATIONS } = require('./cropCatalog');

/**
 * Evaluate and rank crop rotations based on transparent multi-criteria weights
 * 
 * @param {Object} input
 * @param {Object} input.weights Weighting preferences (0-100)
 * @param {number} input.weights.waterConservation Weight for water savings (e.g. 35)
 * @param {number} input.weights.soilHealth Weight for soil enrichment/legumes (e.g. 25)
 * @param {number} input.weights.heatResilience Weight for climate/heat resistance (e.g. 20)
 * @param {number} input.weights.economicPreference Weight for commercial profit (e.g. 20)
 * @param {Object} [input.soilInfo] Soil characteristics (soilType, ph, vwc)
 * @param {Array<string>} [input.previousCrops] List of recently cultivated crops
 * @param {Object} [input.weatherContext] NASA weather summary (meanTemp, totalRainfall, heatEvents)
 * @returns {Object} Ranked rotations with comprehensive explanations
 */
function evaluateCropRotations(input = {}) {
  const {
    weights = {},
    soilInfo = { soilType: 'silty_clay_loam', ph: 6.4 },
    previousCrops = ['T_AMAN_RICE'],
    weatherContext = { meanTemp: 28.5, recentRainfallMm: 12.4 }
  } = input;

  // 1. Normalize weights deterministically
  const rawW = {
    water: Math.max(0, Number(weights.waterConservation ?? 35)),
    soil: Math.max(0, Number(weights.soilHealth ?? 25)),
    heat: Math.max(0, Number(weights.heatResilience ?? 20)),
    econ: Math.max(0, Number(weights.economicPreference ?? 20))
  };

  const totalRaw = rawW.water + rawW.soil + rawW.heat + rawW.econ;
  const normW = totalRaw > 0 ? {
    water: rawW.water / totalRaw,
    soil: rawW.soil / totalRaw,
    heat: rawW.heat / totalRaw,
    econ: rawW.econ / totalRaw
  } : { water: 0.25, soil: 0.25, heat: 0.25, econ: 0.25 };

  // 2. Score each candidate rotation
  const scoredCandidates = CANDIDATE_ROTATIONS.map((rot) => {
    const cropObjects = rot.crops.map((cCode) => CROPS[cCode] || null).filter(Boolean);

    // A. Water Conservation Pillar (0 - 100)
    // Baseline: Lower irrigation demand = higher score
    const totalIrrigationMm = cropObjects.reduce((acc, c) => acc + (c.irrigationRequirementMm || 400), 0);
    // 0 mm => 100 score, 1600 mm => 10 score
    const waterScore = Math.max(10, Math.min(100, Math.round(100 - (totalIrrigationMm / 1600) * 85)));

    // B. Soil Health & Fertility Pillar (0 - 100)
    // Considers legume inclusion (+25), deep rooting crops (+10), and average soil health
    const hasLegume = cropObjects.some((c) => c.nitrogenFixing);
    const avgCropSoil = cropObjects.reduce((acc, c) => acc + (c.soilHealthRating || 50), 0) / cropObjects.length;
    let soilScore = avgCropSoil;
    if (hasLegume) soilScore = Math.min(100, soilScore + 15);
    soilScore = Math.round(Math.max(10, Math.min(100, soilScore)));

    // C. Heat & Climate Resilience Pillar (0 - 100)
    // Considers photosynthetic efficiency (C4 maize) and reproductive heat thresholds
    const avgHeat = cropObjects.reduce((acc, c) => acc + (c.heatResilienceRating || 60), 0) / cropObjects.length;
    // Penalty if potato in very hot weather conditions
    let heatScore = avgHeat;
    if (weatherContext.meanTemp > 30 && rot.crops.includes('POTATO')) {
      heatScore -= 12;
    }
    heatScore = Math.round(Math.max(10, Math.min(100, heatScore)));

    // D. Economic Preference & Profit Pillar (0 - 100)
    const avgEcon = cropObjects.reduce((acc, c) => acc + (c.economicGrossMarginRating || 70), 0) / cropObjects.length;
    const econScore = Math.round(Math.max(10, Math.min(100, avgEcon)));

    // E. Composite Weighted Score
    const compositeScore = Math.round(
      (waterScore * normW.water +
       soilScore * normW.soil +
       heatScore * normW.heat +
       econScore * normW.econ) * 10
    ) / 10;

    // F. Transparent Explanation & Reason Codes
    const reasonCodes = [];
    const explanations = [];

    if (waterScore >= 80) {
      reasonCodes.push('LOW_WATER_AQUIFER_FRIENDLY');
      explanations.push(`High water conservation: estimated irrigation footprint is only ${totalIrrigationMm} mm vs 1350+ mm for conventional Boro.`);
    } else if (waterScore <= 40) {
      reasonCodes.push('HIGH_GROUNDWATER_EXTRACTION');
      explanations.push(`Severe water demand: requires ${totalIrrigationMm} mm irrigation, heavily dependent on deep tubewell extraction.`);
    }

    if (hasLegume) {
      reasonCodes.push('LEGUME_BIOLOGICAL_N_FIXATION');
      explanations.push('Contains grain legume (Mungbean/Lentil) which fixes atmospheric nitrogen, improving soil organic matter and cutting chemical fertilizer costs.');
    }

    if (heatScore >= 75) {
      reasonCodes.push('HIGH_CLIMATE_RESILIENCE');
      explanations.push('Robust heat resilience during peak dry-season temperatures.');
    }

    if (econScore >= 80) {
      reasonCodes.push('HIGH_COMMERCIAL_MARGIN');
      explanations.push('Strong market gross margins driven by high-value cash crops.');
    }

    // Agronomic warnings & pH compatibility
    const constraints = [...rot.constraints];
    const warnings = [...rot.warnings];

    if (soilInfo.ph) {
      const ph = Number(soilInfo.ph);
      for (const crop of cropObjects) {
        if (crop.minPh && ph < crop.minPh) {
          warnings.push(`Soil pH (${ph}) is lower than recommended minimum for ${crop.name} (${crop.minPh}). Consider light lime amendment.`);
        }
        if (crop.maxPh && ph > crop.maxPh) {
          warnings.push(`Soil pH (${ph}) is higher than recommended maximum for ${crop.name} (${crop.maxPh}).`);
        }
      }
    }

    // Check previous crop continuity
    if (previousCrops && previousCrops.includes('BORO_RICE') && rot.crops.includes('BORO_RICE')) {
      warnings.push('Consecutive Boro rice monoculture: increased risk of sheath blight and plow-pan soil compaction.');
    }

    return {
      id: rot.id,
      name: rot.name,
      cycleType: rot.cycleType,
      crops: rot.crops.map((cCode) => CROPS[cCode]),
      description: rot.description,
      pros: rot.pros,
      cons: rot.cons,
      scores: {
        composite: compositeScore,
        water: waterScore,
        soil: soilScore,
        heat: heatScore,
        economic: econScore
      },
      weightedContributions: {
        water: Math.round(waterScore * normW.water * 10) / 10,
        soil: Math.round(soilScore * normW.soil * 10) / 10,
        heat: Math.round(heatScore * normW.heat * 10) / 10,
        economic: Math.round(econScore * normW.econ * 10) / 10
      },
      estimatedWaterUseMm: totalIrrigationMm,
      hasLegume,
      reasonCodes,
      explanations,
      constraints,
      warnings
    };
  });

  // 3. Deterministic Sorting: Highest composite score first
  scoredCandidates.sort((a, b) => b.scores.composite - a.scores.composite);

  // Assign ranks
  scoredCandidates.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return {
    engineVersion: 'agrisense-rotation-v1.0-deterministic',
    evaluatedAt: new Date().toISOString(),
    normalizedWeights: {
      water: Math.round(normW.water * 100),
      soil: Math.round(normW.soil * 100),
      heat: Math.round(normW.heat * 100),
      economic: Math.round(normW.econ * 100)
    },
    topRecommendation: scoredCandidates[0],
    rankedRotations: scoredCandidates,
    metadata: {
      methodology: 'Transparent Multi-Criteria Decision Analysis (MCDA) with FAO-56 Agronomic Constraints',
      isProvisional: true,
      advisoryNote: 'Provisional decision support prototype. Local agricultural extension (DAE Bangladesh / BARI) validation recommended before field implementation.'
    }
  };
}

module.exports = {
  evaluateCropRotations
};
