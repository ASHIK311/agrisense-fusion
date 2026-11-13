/**
 * Google Earth Engine (GEE) Script: NASA SMAP L4 Soil Moisture Extraction
 * Collection: NASA/SMAP/SPL4SMGP/008 (3-hourly 9-km Surface & Root Zone Soil Moisture)
 * Study Region: Godagari Upazila, Rajshahi District, Bangladesh
 * Centroid: 24.469°N, 88.330°E
 *
 * Instructions for Execution:
 * 1. Open Google Earth Engine Code Editor: https://code.earthengine.google.com/
 * 2. Paste this script into the editor.
 * 3. Click 'Run'.
 * 4. In the 'Tasks' tab, click 'Run' next to 'SMAP_Godagari_Export' to export CSV to Google Drive.
 */

// 1. Define Study Centroid and Spatial Buffer (Godagari Upazila)
var godagariPoint = ee.Geometry.Point([88.330, 24.469]);
var godagariAOI = godagariPoint.buffer(5000); // 5km radius buffer around centroid

Map.centerObject(godagariPoint, 11);
Map.addLayer(godagariAOI, {color: 'orange'}, 'Godagari Study AOI');
Map.addLayer(godagariPoint, {color: 'red'}, 'Godagari Centroid');

// 2. Load SMAP L4 Global 3-hourly 9 km Collection
var smapCol = ee.ImageCollection('NASA/SMAP/SPL4SMGP/008')
  .filterDate('2021-01-01', '2023-12-31')
  .select([
    'sm_surface',          // Surface soil moisture (0-5 cm) in m3/m3
    'sm_rootzone',         // Root-zone soil moisture (0-100 cm) in m3/m3
    'sm_surface_wetness',  // Surface relative wetness (dimensionless, 0-1)
    'sm_rootzone_wetness', // Root-zone relative wetness (dimensionless, 0-1)
    'soil_temp_layer1'     // Soil temperature layer 1 in Kelvin
  ]);

print('Total SMAP Images Found:', smapCol.size());

// 3. Daily Mean Aggregation Function
// Converts 3-hourly observations into daily mean summaries
var startDate = ee.Date('2021-01-01');
var endDate = ee.Date('2023-12-31');
var daysCount = endDate.difference(startDate, 'days');

var dailyList = ee.List.sequence(0, daysCount.subtract(1)).map(function(d) {
  var start = startDate.advance(d, 'days');
  var end = start.advance(1, 'days');
  var dailyImages = smapCol.filterDate(start, end);
  var dailyMean = dailyImages.mean().set('date', start.format('YYYY-MM-dd'));
  return dailyMean;
});

var dailyCollection = ee.ImageCollection(dailyList);

// 4. Reduce at Godagari Centroid Point
var smapTimeSeries = dailyCollection.map(function(img) {
  var values = img.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: godagariPoint,
    scale: 9000 // 9km native resolution scale
  });
  
  // Convert Kelvin to Celsius for soil temperature
  var tempK = ee.Number(values.get('soil_temp_layer1'));
  var tempC = ee.Algorithms.If(tempK, tempK.subtract(273.15), null);

  return ee.Feature(null, {
    'date': img.get('date'),
    'latitude': 24.469,
    'longitude': 88.330,
    'sm_surface_m3_m3': values.get('sm_surface'),
    'sm_rootzone_m3_m3': values.get('sm_rootzone'),
    'sm_surface_wetness': values.get('sm_surface_wetness'),
    'sm_rootzone_wetness': values.get('sm_rootzone_wetness'),
    'soil_temp_surface_c': tempC,
    'data_source': 'NASA_SMAP_SPL4SMGP_008',
    'native_resolution_km': 9.0
  });
});

// 5. Export to Google Drive as CSV
Export.table.toDrive({
  collection: smapTimeSeries,
  description: 'SMAP_L4_Soil_Moisture_Godagari_2021_2023',
  folder: 'Field_Shift_Data',
  fileFormat: 'CSV'
});

print('Export task configured. Go to Tasks tab to run export.');
