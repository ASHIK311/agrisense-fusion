/**
 * AgriSense Fusion - Assistant Live Tool Registry
 * Exposes deterministic scientific engines, physics models, and real-time state to the LLM.
 */

const { calculateReferenceET, calculateCropET } = require('../physics/penmanMonteith');
const { calculateTAW, calculateRootZoneDepletion, calculateDailyWaterBalance } = require('../physics/waterBalance');
const { evaluateCropRotations } = require('../decision/cropRotationEngine');
const storage = require('../storage/storageService');
const nasaService = require('../services/nasaService');

const TOOL_DEFINITIONS = [
  {
    name: 'calculate_et0',
    description: 'Calculate FAO-56 Penman-Monteith reference crop evapotranspiration (ET0) in mm/day from meteorological parameters.',
    parameters: {
      type: 'object',
      properties: {
        temp_c: { type: 'number', description: 'Mean daily temperature in °C' },
        temp_min_c: { type: 'number', description: 'Daily minimum temperature in °C' },
        temp_max_c: { type: 'number', description: 'Daily maximum temperature in °C' },
        rh_pct: { type: 'number', description: 'Mean relative humidity in %' },
        wind_speed_2m: { type: 'number', description: 'Wind speed at 2m height in m/s (default 2.0)' },
        solar_radiation_mj: { type: 'number', description: 'Daily solar radiation in MJ/m²/day' },
        pressure_kpa: { type: 'number', description: 'Atmospheric pressure in kPa (default 100.8 for Godagari at 25m elev)' }
      },
      required: ['temp_c']
    }
  },
  {
    name: 'calculate_water_balance',
    description: 'Calculate FAO-56 daily root zone soil water balance, root zone depletion (Dr), and water stress coefficient (Ks).',
    parameters: {
      type: 'object',
      properties: {
        soil_type: { type: 'string', description: 'Soil textural class (e.g. silty_clay_loam, clay_loam, sandy_loam)' },
        root_depth_m: { type: 'number', description: 'Effective root depth in meters (e.g. 0.4 for rice, 0.6 for wheat)' },
        p_depletion: { type: 'number', description: 'Fraction of TAW that can be depleted without moisture stress (0.2 - 0.7)' },
        initial_depletion_mm: { type: 'number', description: 'Initial root zone depletion in mm' },
        etc_mm: { type: 'number', description: 'Crop evapotranspiration (ETc) in mm/day' },
        precip_mm: { type: 'number', description: 'Effective precipitation in mm/day' },
        irrigation_mm: { type: 'number', description: 'Irrigation depth applied in mm/day' }
      },
      required: ['soil_type', 'root_depth_m']
    }
  },
  {
    name: 'evaluate_crop_rotations',
    description: 'Evaluate and rank High Barind sustainable crop rotation sequences using Multi-Criteria Decision Analysis (MCDA).',
    parameters: {
      type: 'object',
      properties: {
        water_conservation: { type: 'number', description: 'Weight for water conservation / groundwater protection (0-100, default 35)' },
        soil_health: { type: 'number', description: 'Weight for soil enrichment / legume inclusion (0-100, default 25)' },
        heat_resilience: { type: 'number', description: 'Weight for climate / drought resilience (0-100, default 20)' },
        economic_preference: { type: 'number', description: 'Weight for commercial market return (0-100, default 20)' },
        previous_crops: { type: 'array', items: { type: 'string' }, description: 'Recently cultivated crops in field' }
      }
    }
  },
  {
    name: 'get_weather_risk',
    description: 'Retrieve current NASA POWER agro-meteorological conditions and compound heat-dry severity risk rating for Godagari.',
    parameters: {
      type: 'object',
      properties: {
        lat: { type: 'number', description: 'Latitude (default 24.469 for Godagari)' },
        lon: { type: 'number', description: 'Longitude (default 88.330 for Godagari)' }
      }
    }
  },
  {
    name: 'get_sensor_telemetry',
    description: 'Retrieve latest FDR capacitive soil moisture, temperature, and pH telemetry from ground field probes (simulated prototype).',
    parameters: {
      type: 'object',
      properties: {
        field_id: { type: 'string', description: 'Field identifier (e.g. field-godagari-a)' }
      }
    }
  },
  {
    name: 'screen_crop_diseases',
    description: 'Perform microclimate-based environmental risk screening for 17 validated Bangladesh crop pathogens.',
    parameters: {
      type: 'object',
      properties: {
        crop: { type: 'string', description: 'Crop type (e.g. Rice, Wheat, Potato, Mustard, Maize)' },
        temp_c: { type: 'number', description: 'Air temperature in °C' },
        rh_pct: { type: 'number', description: 'Relative humidity in %' },
        leaf_wetness_hours: { type: 'number', description: 'Hours of continuous leaf wetness' }
      },
      required: ['crop']
    }
  },
  {
    name: 'get_groundwater_status',
    description: 'Retrieve BMDA deep tubewell monitoring hydrograph and High Barind regional aquifer drawdown trends.',
    parameters: {
      type: 'object',
      properties: {
        farm_id: { type: 'string', description: 'Farm identifier (e.g. farm-barind-01)' }
      }
    }
  },
  {
    name: 'get_crop_suitability',
    description: 'Retrieve BARC AEZ 26 crop suitability classifications for High Barind agricultural land.',
    parameters: {
      type: 'object',
      properties: {
        crop_id: { type: 'string', description: 'Optional specific crop name (e.g. Boro, Aman, Wheat, Mustard, Chickpea)' }
      }
    }
  },
  {
    name: 'search_research_papers',
    description: 'Search 60 peer-reviewed research papers and DOI links covering Bangladesh crops, water balance, and High Barind hydrology.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keywords to search (e.g. groundwater, drawdown, FAO-56, blast, Barind)' },
        crop: { type: 'string', description: 'Optional crop filter (e.g. Rice, Wheat, Potato)' },
        limit: { type: 'number', description: 'Maximum papers to return (default 5)' }
      },
      required: ['query']
    }
  }
];

class ToolRegistry {
  constructor() {
    this.tools = TOOL_DEFINITIONS;
  }

  getToolDefinitions() {
    return this.tools;
  }

  async executeTool(name, params = {}, userContext = null) {
    // Enforce multi-tenant farm/field ownership if farm_id or field_id is supplied
    if (params && params.farm_id) {
      const rawFarm = (storage.state?.farms || []).find((f) => f.id === params.farm_id);
      if (!rawFarm) {
        const err = new Error(`Farm '${params.farm_id}' not found.`);
        err.statusCode = 404;
        err.code = 'FARM_NOT_FOUND';
        throw err;
      }
      const accessibleFarm = storage.getFarmById(params.farm_id, userContext);
      if (!accessibleFarm) {
        const err = new Error(
          userContext
            ? `Access denied: You do not have permission to access private farm '${params.farm_id}'.`
            : `Authentication required to access private farm '${params.farm_id}'.`
        );
        err.statusCode = userContext ? 403 : 401;
        err.code = userContext ? 'FORBIDDEN' : 'UNAUTHORIZED';
        throw err;
      }
    }

    if (params && params.field_id) {
      const rawField = (storage.state?.fields || []).find((f) => f.id === params.field_id);
      if (!rawField) {
        const err = new Error(`Field '${params.field_id}' not found.`);
        err.statusCode = 404;
        err.code = 'FIELD_NOT_FOUND';
        throw err;
      }
      const accessibleField = storage.getFieldById(params.field_id, userContext);
      if (!accessibleField) {
        const err = new Error(
          userContext
            ? `Access denied: You do not have permission to access private field '${params.field_id}'.`
            : `Authentication required to access private field '${params.field_id}'.`
        );
        err.statusCode = userContext ? 403 : 401;
        err.code = userContext ? 'FORBIDDEN' : 'UNAUTHORIZED';
        throw err;
      }
    }

    switch (name) {
      case 'calculate_et0': {
        const useCurrentWeather = params.use_current_weather === true;
        const allowIllustrative = params.allow_illustrative_defaults === true;

        let latestRecord = null;
        if (useCurrentWeather) {
          const records = storage.getWeatherRecords(1);
          latestRecord = records.length > 0 ? records[records.length - 1] : null;
        }

        const rawTMean = params.temp_c !== undefined ? Number(params.temp_c) : undefined;
        const rawTMin = params.temp_min_c !== undefined
          ? Number(params.temp_min_c)
          : (latestRecord?.t_min !== undefined ? Number(latestRecord.t_min) : undefined);
        const rawTMax = params.temp_max_c !== undefined
          ? Number(params.temp_max_c)
          : (latestRecord?.t_max !== undefined ? Number(latestRecord.t_max) : undefined);
        const rawRh = params.rh_pct !== undefined
          ? Number(params.rh_pct)
          : (latestRecord?.humidity !== undefined ? Number(latestRecord.humidity) : undefined);
        const rawWind2m = params.wind_speed_2m !== undefined
          ? Number(params.wind_speed_2m)
          : (latestRecord?.wind_speed !== undefined ? Number(latestRecord.wind_speed) : undefined);
        const rawSolar = params.solar_radiation_mj !== undefined
          ? Number(params.solar_radiation_mj)
          : (latestRecord?.solar_radiation !== undefined ? Number(latestRecord.solar_radiation) : undefined);

        const hasTemp = (rawTMean !== undefined && !isNaN(rawTMean)) ||
          (rawTMin !== undefined && !isNaN(rawTMin) && rawTMax !== undefined && !isNaN(rawTMax));
        const hasRh = rawRh !== undefined && !isNaN(rawRh);
        const hasWind = rawWind2m !== undefined && !isNaN(rawWind2m);
        const hasSolar = rawSolar !== undefined && !isNaN(rawSolar);

        const missingFlags = {
          temperature: !hasTemp,
          relative_humidity_pct: !hasRh,
          wind_speed_2m_m_s: !hasWind,
          solar_radiation_mj_m2_day: !hasSolar
        };
        const missingInputs = Object.entries(missingFlags)
          .filter(([, isMissing]) => isMissing)
          .map(([key]) => key);

        const obsDate = params.observation_date || latestRecord?.date || null;
        let stalenessDays = null;
        let isStale = false;
        if (obsDate) {
          const parsedObs = new Date(obsDate);
          if (!isNaN(parsedObs.getTime())) {
            stalenessDays = Math.max(0, Math.floor((Date.now() - parsedObs.getTime()) / (1000 * 60 * 60 * 24)));
            isStale = stalenessDays > 7;
          }
        }

        const sourceCoordinate = {
          latitude: 24.3636,
          longitude: 88.6241,
          station_name: 'Rajshahi Meteorological Station / Airport (NASA POWER Grid Point)',
          distance_from_godagari_centroid_km: 34.8,
          bearing_from_godagari: 'ESE',
          parameter_resolution: {
            meteorology_merra2: '0.5° x 0.625° (~55 km x 63 km)',
            solar_ceres: '1.0° x 1.0° (~111 km x 101 km)'
          }
        };

        const units = {
          temp_c: '°C',
          temp_min_c: '°C',
          temp_max_c: '°C',
          rh_pct: '%',
          wind_speed_2m: 'm/s',
          solar_radiation_mj: 'MJ/m²/day',
          reference_et_mm_day: 'mm/day'
        };

        // Do NOT silently substitute 75% RH, 2.0 m/s wind, or 19.5 MJ/m²/day solar radiation
        if (missingInputs.length > 0 && !allowIllustrative) {
          return {
            tool: 'calculate_et0',
            status: 'MISSING_REQUIRED_INPUTS',
            reference_et_mm_day: null,
            missing_inputs: missingInputs,
            missing_value_flags: missingFlags,
            source_coordinate: sourceCoordinate,
            observation_date: obsDate,
            is_stale: isStale,
            data_staleness_days: stalenessDays,
            provider: useCurrentWeather ? 'NASA_POWER_AG_ARCHIVE' : 'USER_EXPLICIT_INPUTS',
            units,
            methodology: 'FAO-56 Penman-Monteith (Allen et al. 1998)',
            message: `Cannot compute live FAO-56 Penman-Monteith ET0 because required meteorological inputs are missing (${missingInputs.join(', ')}). Silent default substitution (e.g. RH=75%, wind=2.0 m/s, solar=19.5 MJ/m²/day) is disabled for scientific integrity. Supply all required meteorological measurements, pass use_current_weather=true to use the latest archived NASA POWER record, or pass allow_illustrative_defaults=true for an explicitly labeled illustrative example.`
          };
        }

        const assumptionsDisclosed = [];
        const tMean = hasTemp
          ? (rawTMean !== undefined && !isNaN(rawTMean) ? rawTMean : Math.round(((rawTMin + rawTMax) / 2) * 100) / 100)
          : 28.5;
        if (!hasTemp) assumptionsDisclosed.push('temp_c assumed 28.5°C (illustrative mode)');

        const tMin = rawTMin !== undefined && !isNaN(rawTMin) ? rawTMin : Math.round((tMean - 5.0) * 100) / 100;
        if (rawTMin === undefined || isNaN(rawTMin)) assumptionsDisclosed.push(`temp_min_c estimated as tMean - 5.0°C (${tMin}°C)`);

        const tMax = rawTMax !== undefined && !isNaN(rawTMax) ? rawTMax : Math.round((tMean + 5.0) * 100) / 100;
        if (rawTMax === undefined || isNaN(rawTMax)) assumptionsDisclosed.push(`temp_max_c estimated as tMean + 5.0°C (${tMax}°C)`);

        const rhMean = hasRh ? rawRh : 75.0;
        if (!hasRh) assumptionsDisclosed.push('rh_pct assumed 75.0% (illustrative mode)');

        const windSpeed2m = hasWind ? rawWind2m : 2.0;
        if (!hasWind) assumptionsDisclosed.push('wind_speed_2m assumed 2.0 m/s (illustrative mode)');

        const solarRadiationMJ = hasSolar ? rawSolar : 19.5;
        if (!hasSolar) assumptionsDisclosed.push('solar_radiation_mj assumed 19.5 MJ/m²/day (illustrative mode)');

        const et0Obj = calculateReferenceET({
          date: obsDate || undefined,
          tMean,
          tMin,
          tMax,
          rhMean,
          windSpeed2m,
          solarRadiationMJ,
          latitude: 24.469,
          elevationM: 28.0
        });

        const et0Val = et0Obj && typeof et0Obj.et0 === 'number' ? et0Obj.et0 : null;
        const provider = useCurrentWeather
          ? 'NASA_POWER_AG_ARCHIVE'
          : (assumptionsDisclosed.length > 0 ? 'ILLUSTRATIVE_ASSUMPTION_MODE' : 'USER_EXPLICIT_INPUTS');

        return {
          tool: 'calculate_et0',
          status: isStale
            ? 'COMPUTED_FROM_STALE_ARCHIVE'
            : (assumptionsDisclosed.length > 0 ? 'ILLUSTRATIVE_ASSUMPTIONS_APPLIED' : 'COMPUTED_FROM_VERIFIED_INPUTS'),
          inputs: { tMean, tMin, tMax, rhMean, windSpeed2m, solarRadiationMJ },
          reference_et_mm_day: et0Val,
          source_coordinate: sourceCoordinate,
          observation_date: obsDate,
          is_stale: isStale,
          data_staleness_days: stalenessDays,
          provider,
          units,
          missing_value_flags: missingFlags,
          assumptions_disclosed: assumptionsDisclosed,
          staleness_warning: isStale
            ? `Archive observation date (${obsDate}) is ${stalenessDays} days old. This ET0 reflects historical reanalysis conditions on ${obsDate}, not live real-time field telemetry.`
            : null,
          confidence: et0Obj?.confidence || 'high',
          methodology: 'FAO-56 Penman-Monteith (Allen et al. 1998)',
          interpretation: et0Val === null
            ? 'Calculation failed due to invalid inputs'
            : (et0Val > 5.0 ? 'High atmospheric evaporative demand' : et0Val > 3.5 ? 'Moderate evaporative demand' : 'Low evaporative demand')
        };
      }

      case 'calculate_water_balance': {
        const allowProvisional = params.allow_provisional_defaults === true;
        const useFieldContext = params.use_field_context === true;

        let fieldRecord = null;
        let latestWeather = null;
        let latestSensor = null;
        if (useFieldContext || params.field_id) {
          const targetFieldId = params.field_id || 'field-godagari-a';
          fieldRecord = storage.getFieldById(targetFieldId, userContext);
          latestSensor = storage.getLatestReading(targetFieldId);
          const wRecords = storage.getWeatherRecords(1);
          latestWeather = wRecords.length > 0 ? wRecords[wRecords.length - 1] : null;
        }

        const hasSoilType = params.soil_type !== undefined && params.soil_type !== null && params.soil_type !== '';
        const hasRootDepth = params.root_depth_m !== undefined && !isNaN(Number(params.root_depth_m));
        const hasInitialDepletion = params.initial_depletion_mm !== undefined && !isNaN(Number(params.initial_depletion_mm));
        const hasEtc = params.etc_mm !== undefined && !isNaN(Number(params.etc_mm));
        const hasPrecip = params.precip_mm !== undefined && !isNaN(Number(params.precip_mm));
        const hasIrrigation = params.irrigation_mm !== undefined && !isNaN(Number(params.irrigation_mm));
        const hasPDepletion = params.p_depletion !== undefined && !isNaN(Number(params.p_depletion));

        const missingFlags = {
          soil_type: !hasSoilType && !fieldRecord?.soil_type,
          root_depth_m: !hasRootDepth && !fieldRecord?.root_depth_m,
          p_depletion: !hasPDepletion,
          initial_depletion_mm: !hasInitialDepletion,
          etc_mm: !hasEtc,
          precip_mm: !hasPrecip,
          irrigation_mm: !hasIrrigation
        };
        const missingInputs = Object.entries(missingFlags)
          .filter(([, isMissing]) => isMissing)
          .map(([key]) => key);

        const telemetryProvenance = {
          has_physical_sensors: false,
          is_simulated: true,
          calibration_status: 'UNCALIBRATED',
          sensor_basis_disclosure: 'No calibrated physical in-situ soil moisture sensors are deployed. Any sensor readings in the store are simulated ESP32/FDR prototype records (UNCALIBRATED) and are not used as verified physical ground truth.'
        };

        // Never silently interpret missing precip_mm as measured 0.0 or default ETc=3.8 / irrigation=0.0
        if (missingInputs.length > 0 && !allowProvisional && !useFieldContext) {
          return {
            tool: 'calculate_water_balance',
            status: 'MISSING_REQUIRED_INPUTS',
            missing_inputs: missingInputs,
            missing_value_flags: missingFlags,
            telemetry_provenance: telemetryProvenance,
            daily_balance: null,
            irrigation_needed: null,
            methodology: 'FAO-56 Daily Root-Zone Soil Water Balance (Allen et al. 1998, Chapter 8)',
            message: `Cannot compute live FAO-56 daily soil water balance because required inputs are missing (${missingInputs.join(', ')}). Missing rainfall is never silently interpreted as measured 0.0 mm, and default ETc (3.8 mm/day) or irrigation (0.0 mm) are not silently substituted. Supply all required field/water-balance inputs, or pass allow_provisional_defaults=true (or use_field_context=true) for an explicitly labeled provisional calculation.`
          };
        }

        const provisionalAssumptions = [];
        const soilType = hasSoilType
          ? params.soil_type
          : (fieldRecord?.soil_type || 'silty_clay_loam');
        if (!hasSoilType) {
          provisionalAssumptions.push(`soil_type set to '${soilType}' (${fieldRecord ? `from demo field ${fieldRecord.id}` : 'provisional High Barind default'})`);
        }

        const rootDepth = hasRootDepth
          ? Number(params.root_depth_m)
          : (fieldRecord?.root_depth_m ? Number(fieldRecord.root_depth_m) : 0.50);
        if (!hasRootDepth) {
          provisionalAssumptions.push(`root_depth_m set to ${rootDepth} m (${fieldRecord ? `from field ${fieldRecord.id}` : 'canonical High Barind provisional default'})`);
        }

        const p = hasPDepletion ? Number(params.p_depletion) : 0.50;
        if (!hasPDepletion) {
          provisionalAssumptions.push('p_depletion assumed 0.50 (FAO-56 standard depletion fraction)');
        }

        const thetaFC = fieldRecord?.theta_fc || (soilType === 'clay' ? 0.38 : (soilType === 'sandy_loam' ? 0.22 : 0.323));
        const thetaWP = fieldRecord?.theta_wp || (soilType === 'clay' ? 0.22 : (soilType === 'sandy_loam' ? 0.10 : 0.165));

        const tawVal = calculateTAW(thetaFC, thetaWP, rootDepth) || 79.0;

        let prevDepletion;
        if (hasInitialDepletion) {
          prevDepletion = Number(params.initial_depletion_mm);
        } else {
          prevDepletion = Math.round(tawVal * 0.45 * 10) / 10;
          provisionalAssumptions.push(`initial_depletion_mm assumed ${prevDepletion} mm (45% of TAW=${tawVal} mm; no calibrated physical soil moisture probe installed)`);
        }

        let etc;
        if (hasEtc) {
          etc = Number(params.etc_mm);
        } else {
          etc = 3.8;
          provisionalAssumptions.push('etc_mm assumed 3.8 mm/day (provisional Rabi mid-season crop evapotranspiration)');
        }

        let precip;
        if (hasPrecip) {
          precip = Number(params.precip_mm);
        } else if (useFieldContext && latestWeather && latestWeather.rainfall !== undefined) {
          precip = Number(latestWeather.rainfall);
          provisionalAssumptions.push(`precip_mm=${precip} mm taken from archived NASA POWER record (${latestWeather.date}, ~34.8 km ESE of Godagari), not an on-farm rain gauge`);
        } else {
          precip = 0.0;
          provisionalAssumptions.push('precip_mm assumed 0.0 mm (provisional dry-season assumption — NOT a measured rain-gauge observation)');
        }

        let irrigation;
        if (hasIrrigation) {
          irrigation = Number(params.irrigation_mm);
        } else {
          irrigation = 0.0;
          provisionalAssumptions.push('irrigation_mm assumed 0.0 mm (provisional un-irrigated day baseline)');
        }

        const balanceObj = calculateDailyWaterBalance({
          drPrevious: prevDepletion,
          etc,
          precipitationMm: precip,
          irrigationMm: irrigation,
          taw: tawVal
        });

        const rawVal = Math.round(tawVal * p * 10) / 10;
        const newDr = balanceObj?.drNext !== undefined
          ? balanceObj.drNext
          : (balanceObj?.drNew !== undefined ? balanceObj.drNew : prevDepletion);
        const ks = Math.max(0, Math.min(1, newDr <= rawVal ? 1.0 : (tawVal - newDr) / ((1 - p) * tawVal)));
        const status = newDr >= tawVal
          ? 'STRESS_CRITICAL'
          : (newDr > rawVal ? 'IRRIGATION_RECOMMENDED' : 'OPTIMAL_MOISTURE');

        return {
          tool: 'calculate_water_balance',
          status: provisionalAssumptions.length > 0
            ? 'PROVISIONAL_ASSUMPTIONS_APPLIED'
            : 'COMPUTED_FROM_EXPLICIT_INPUTS',
          soil_type: soilType,
          root_depth_m: rootDepth,
          theta_fc: thetaFC,
          theta_wp: thetaWP,
          taw_mm: tawVal,
          raw_mm: rawVal,
          inputs_used: {
            initial_depletion_mm: prevDepletion,
            etc_mm: etc,
            precip_mm: precip,
            effective_precip_mm: balanceObj?.peff ?? 0,
            irrigation_mm: irrigation,
            p_depletion: p
          },
          daily_balance: {
            previous_depletion_mm: prevDepletion,
            depletion_mm: Math.round(newDr * 100) / 100,
            depletion_pct_taw: Math.round((newDr / tawVal) * 1000) / 10,
            deep_percolation_mm: balanceObj?.deepPercolation ?? 0,
            runoff_mm: balanceObj?.runoff ?? 0,
            ks: Math.round(ks * 100) / 100,
            status
          },
          irrigation_needed: status === 'IRRIGATION_RECOMMENDED' || status === 'STRESS_CRITICAL',
          recommended_net_irrigation_mm: (status === 'IRRIGATION_RECOMMENDED' || status === 'STRESS_CRITICAL')
            ? Math.round(newDr * 10) / 10
            : 0.0,
          missing_value_flags: missingFlags,
          provisional_assumptions_disclosed: provisionalAssumptions,
          telemetry_provenance: telemetryProvenance,
          warnings: balanceObj?.warnings || []
        };
      }

      case 'evaluate_crop_rotations': {
        const outcome = evaluateCropRotations({
          weights: {
            waterConservation: params.water_conservation ?? 35,
            soilHealth: params.soil_health ?? 25,
            heatResilience: params.heat_resilience ?? 20,
            economicPreference: params.economic_preference ?? 20
          },
          previousCrops: params.previous_crops || ['T_AMAN_RICE']
        });
        return {
          tool: 'evaluate_crop_rotations',
          top_rotation: outcome.rankedRotations[0],
          all_ranked: outcome.rankedRotations,
          meta: outcome.meta
        };
      }

      case 'get_weather_risk': {
        const summary = storage.getWeatherSummary();
        const records = storage.getWeatherRecords(5);
        const latest = records[records.length - 1] || {};
        const tMax = Number(latest.t_max ?? 0);
        const rh = Number(latest.humidity ?? 100);
        const rain = Number(latest.rainfall ?? 0);
        const vpd = Number(latest.vpd_kpa ?? 0);
        const cdd = Number(latest.consecutive_dry_days ?? 0);
        const primaryTriggered = tMax >= 35.0 && rh <= 50.0 && rain <= 1.0;
        const moderateTriggered = !primaryTriggered && tMax >= 33.0 && (rh <= 55.0 || cdd >= 7);

        return {
          tool: 'get_weather_risk',
          station: 'Rajshahi Meteorological Station (24.3636°N, 88.6241°E, ~34.8 km ESE of Godagari)',
          climatology: summary,
          recent_days: records.slice(-3),
          risk_assessment: {
            primary_rule: 'Tmax >= 35.0°C AND RH <= 50.0% AND Rainfall <= 1.0 mm',
            compound_risk: primaryTriggered ? 'HIGH_HEAT_DRYNESS_RISK' : (moderateTriggered ? 'MODERATE_RISK' : 'LOW_NORMAL'),
            secondary_desiccation_context: {
              vpd_kpa: vpd,
              consecutive_dry_days: cdd,
              note: 'VPD >= 2.0 kPa and consecutive dry days >= 10 serve as secondary desiccation context only.'
            },
            note: 'High Barind experiences acute pre-monsoon heat and dry-season deficit. Atmospheric screening rule is not a multi-day NWP forecast.'
          }
        };
      }

      case 'get_sensor_telemetry': {
        const targetFieldId = params.field_id || 'field-godagari-a';
        const rawField = (storage.state?.fields || []).find((f) => f.id === targetFieldId);
        if (rawField && !rawField.is_demo && !rawField.is_public) {
          const accessible = storage.getFieldById(targetFieldId, userContext);
          if (!accessible) {
            const err = new Error(
              userContext
                ? `Access denied: Field '${targetFieldId}' belongs to another user.`
                : `Authentication required to read private sensor telemetry for '${targetFieldId}'.`
            );
            err.statusCode = userContext ? 403 : 401;
            err.code = userContext ? 'FORBIDDEN' : 'UNAUTHORIZED';
            throw err;
          }
        }
        const reading = storage.getLatestReading(targetFieldId);
        return {
          tool: 'get_sensor_telemetry',
          field_id: targetFieldId,
          provenance: {
            is_simulated: true,
            calibration_status: 'UNCALIBRATED',
            has_physical_sensors: false,
            hardware: 'Simulated ESP32 / Capacitive FDR v2 Prototype (Member 3 5-tier schema)',
            calibration_limitation: 'Site-specific gravimetric soil calibration curves (dry/saturated ADC points and EC/temperature compensation) have not been executed in the field. Do not treat simulated readings as verified physical telemetry.'
          },
          reading: reading || null
        };
      }

      case 'screen_crop_diseases': {
        const crop = params.crop || 'Rice';
        const tempC = Number(params.temp_c ?? params.temp) || 28.0;
        const rhPct = Number(params.rh_pct ?? params.rh) || 82.0;
        const leafWetness = params.leaf_wetness_hours !== undefined && params.leaf_wetness_hours !== null
          ? Number(params.leaf_wetness_hours)
          : 8.0;
        const soilTempC = params.soil_temp_c !== undefined || params.soil_temp !== undefined
          ? Number(params.soil_temp_c ?? params.soil_temp)
          : null;
        const soilMoistureVwc = params.soil_moisture_vwc !== undefined || params.soil_moisture !== undefined
          ? Number(params.soil_moisture_vwc ?? params.soil_moisture)
          : null;

        const diseases = storage.getDiseases(crop);
        const results = [];

        for (const d of diseases) {
          const rules = d.climate_rules || {};
          const minTemp = rules.temp_min_c !== undefined ? parseFloat(rules.temp_min_c) : (rules.min_temp_c || 15.0);
          const maxTemp = rules.temp_max_c !== undefined ? parseFloat(rules.temp_max_c) : (rules.max_temp_c || 35.0);
          const optMinTemp = rules.temp_opt_min_c !== undefined ? parseFloat(rules.temp_opt_min_c) : (rules.opt_temp_min_c || 22.0);
          const optMaxTemp = rules.temp_opt_max_c !== undefined ? parseFloat(rules.temp_opt_max_c) : (rules.opt_temp_max_c || 30.0);
          const minRh = rules.rh_min_pct !== undefined ? parseFloat(rules.rh_min_pct) : (rules.min_rh_pct || 80.0);
          const isSoilBorneNoLeafWetness =
            d.disease_id === 'DIS_POTATO_002' ||
            rules.min_leaf_wetness_hours === null ||
            (d.epidemiology && d.epidemiology.toLowerCase().includes('soil-borne'));
          const isVectorBorneVirus =
            d.pathogen_type === 'Virus' ||
            d.disease_id === 'DIS_TOMATO_001';

          let risk = 'LOW';
          let screeningRuleNote = 'Foliar canopy temperature, relative humidity, and leaf wetness duration threshold rule';

          if (isSoilBorneNoLeafWetness) {
            const effTemp = soilTempC !== null && !isNaN(soilTempC) ? soilTempC : tempC;
            const tempInOpt = effTemp >= optMinTemp && effTemp <= optMaxTemp;
            const tempInPerm = effTemp >= minTemp && effTemp <= maxTemp;
            const wetSoil = soilMoistureVwc !== null && !isNaN(soilMoistureVwc)
              ? soilMoistureVwc >= 0.30
              : rhPct >= minRh;
            if (tempInOpt && wetSoil) risk = 'HIGH';
            else if (tempInPerm && (wetSoil || effTemp >= 25.0)) risk = 'MODERATE';
            screeningRuleNote = 'Soil-borne vascular pathogen (leaf_wetness_hours = null; driven by warm soil temperature >= 28°C and high soil moisture / waterlogging)';
          } else if (isVectorBorneVirus) {
            const tempInOpt = tempC >= optMinTemp && tempC <= optMaxTemp;
            const tempInPerm = tempC >= minTemp && tempC <= maxTemp;
            if (tempInOpt && rhPct >= minRh && rhPct <= 80.0) risk = 'HIGH';
            else if (tempInPerm) risk = 'MODERATE';
            screeningRuleNote = 'Insect vector-borne viral pathogen (whitefly Bemisia tabaci; favored by warm, dry-to-moderate RH)';
          } else {
            const minWet = rules.min_leaf_wetness_hours !== undefined && rules.min_leaf_wetness_hours !== null
              ? parseFloat(rules.min_leaf_wetness_hours)
              : 6.0;
            const tempInOptimal = tempC >= optMinTemp && tempC <= optMaxTemp;
            const tempInRange = tempC >= minTemp && tempC <= maxTemp;
            const rhConducive = rhPct >= minRh;
            const wetConducive = leafWetness >= minWet;
            if (tempInOptimal && rhConducive && wetConducive) risk = 'HIGH';
            else if (tempInRange && (rhConducive || wetConducive)) risk = 'MODERATE';
          }

          results.push({
            disease_id: d.disease_id,
            common_name: d.disease_name || d.common_name,
            scientific_name: d.scientific_name,
            pathogen_type: d.pathogen_type,
            leaf_wetness_applicable: !isSoilBorneNoLeafWetness && !isVectorBorneVirus,
            screening_rule: screeningRuleNote,
            risk_level: risk,
            optimal_temp_range: `${optMinTemp}°C - ${optMaxTemp}°C`,
            symptoms: d.symptoms,
            organic_management: d.management?.cultural_control || d.management?.cultural_controls || d.organic_management
          });
        }

        return {
          tool: 'screen_crop_diseases',
          crop,
          microclimate: { tempC, rhPct, leafWetness, soilTempC, soilMoistureVwc },
          disclaimer: 'Notice: This represents environmental/soil epidemiological risk screening for decision-support, not an official laboratory or visual diagnosis. Consult local DAE upazila agriculture officers or BARI plant pathologists before applying chemical controls.',
          screened_diseases: results
        };
      }

      case 'get_groundwater_status': {
        const targetFarmId = params.farm_id || 'farm-barind-01';
        const rawFarm = (storage.state?.farms || []).find((f) => f.id === targetFarmId);
        if (rawFarm && !rawFarm.is_demo && !rawFarm.is_public) {
          const accessible = storage.getFarmById(targetFarmId, userContext);
          if (!accessible) {
            const err = new Error(
              userContext
                ? `Access denied: Farm '${targetFarmId}' belongs to another user.`
                : `Authentication required to access private groundwater records for '${targetFarmId}'.`
            );
            err.statusCode = userContext ? 403 : 401;
            err.code = userContext ? 'FORBIDDEN' : 'UNAUTHORIZED';
            throw err;
          }
        }
        const records = storage.getGroundwater(targetFarmId);
        return {
          tool: 'get_groundwater_status',
          farm_id: targetFarmId,
          authority: 'Barind Multipurpose Development Authority (BMDA)',
          data_provenance: {
            source_type: 'SYNTHETIC_REGIONAL_PROXY',
            is_live_piezometer_telemetry: false,
            literature_parameterization: 'Parameterized from published High Barind piezometric studies (Jahan et al., 2010; Islam et al., 2022) showing ~0.65 m/year long-term water table decline (18.2m in 2019 to 21.8m in 2024).'
          },
          historical_drawdown_trend: '0.65 m/year (Jahan et al. 2010; synthetic regional hydrograph proxy)',
          hydrograph_records: records,
          aquifer_condition: 'CRITICAL_OVERDRAFT',
          management_recommendation: 'Transition from high-water Boro rice monoculture to low-water Rabi candidate crops (Mustard, Wheat, Chickpea, Lentil) to reduce deep tubewell groundwater extraction.'
        };
      }

      case 'get_crop_suitability': {
        const list = storage.getAgronomySuitability();
        const filtered = params.crop_id
          ? list.filter((c) => c.crop_name.toLowerCase().includes(params.crop_id.toLowerCase()))
          : list;
        return {
          tool: 'get_crop_suitability',
          aez: 'AEZ 26 — High Barind Tract (Godagari, Rajshahi)',
          suitability_table: filtered
        };
      }

      case 'search_research_papers': {
        const query = (params.query || '').toLowerCase();
        const limit = Number(params.limit) || 5;
        const allPapers = storage.getResearchPapers(60);

        const matched = allPapers.filter((p) => {
          const matchTitle = p.title && p.title.toLowerCase().includes(query);
          const matchAbstract = (p.key_findings || p.abstract) && (p.key_findings || p.abstract).toLowerCase().includes(query);
          const matchCrop = params.crop ? (p.crop && p.crop.toLowerCase().includes(params.crop.toLowerCase())) : true;
          return (matchTitle || matchAbstract) && matchCrop;
        });

        return {
          tool: 'search_research_papers',
          query: params.query,
          total_matches: matched.length,
          papers: (matched.length > 0 ? matched : allPapers.slice(0, limit)).slice(0, limit).map((p) => ({
            id: p.paper_id || p.id,
            title: p.title,
            authors: p.authors,
            journal: p.journal_or_publisher || p.journal,
            year: p.year,
            doi: p.doi_or_url || p.doi,
            summary: p.key_findings || p.abstract
          }))
        };
      }

      default:
        throw new Error(`Unknown tool: '${name}'`);
    }
  }
}

module.exports = new ToolRegistry();
