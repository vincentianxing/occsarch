require([
  'esri/Map',
  'esri/views/MapView',
  'esri/Basemap',
  'esri/widgets/BasemapToggle',
  'esri/widgets/BasemapGallery',
	'esri/widgets/Slider',
  'esri/layers/TileLayer',
  'esri/layers/MapImageLayer',
  'esri/layers/FeatureLayer',
  'esri/layers/support/Sublayer',
  'esri/renderers/HeatmapRenderer'
], function (
  Map,
  MapView,
  Basemap,
  BasemapToggle,
  BasemapGallery,
  Slider,
  TileLayer,
  MapImageLayer,
  FeatureLayer,
	SubLayer,
	HeatmapRenderer
) {

  // Create a custom basemap
  var basemap = new Basemap({
    baseLayers: [
      new TileLayer({
        url:
          'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer',
        title: 'Basemap',
      }),
    ],
    title: 'basemap',
    id: 'basemap',
  });

	// Currently unused
	/*
	var ecoLayer = new MapImageLayer({
    url: 'https://rmgsc.cr.usgs.gov/arcgis/rest/services/contUS/MapServer',
		sublayers: [
      {
        id: 4,
        visible: false,
      },
      {
        id: 3,
        visible: false,
      },
      {
        id: 2,
        visible: false,
      },
      {
        id: 1,
        visible: false,
      },
      {
        id: 0,
        visible: false,
      },
    ]
  });
	*/

	// TODO: customize the heatmap so that it looks better
	// Change colors and make it transparent?
  // Heatmap
  const heatmap = {
    type: 'heatmap',
    colorStops: [
      { color: 'rgba(63, 40, 102, 0)', ratio: 0 },
      { color: '#472b77', ratio: 0.083 },
      { color: '#4e2d87', ratio: 0.166 },
      { color: '#563098', ratio: 0.249 },
      { color: '#5d32a8', ratio: 0.332 },
      { color: '#6735be', ratio: 0.415 },
      { color: '#7139d4', ratio: 0.498 },
      { color: '#7b3ce9', ratio: 0.581 },
      { color: '#853fff', ratio: 0.664 },
      { color: '#a46fbf', ratio: 0.747 },
      { color: '#c29f80', ratio: 0.83 },
      { color: '#e0cf40', ratio: 0.913 },
      { color: '#ffff00', ratio: 1 },
    ],
    maxPixelIntensity: 25,
    minPixelIntensity: 0,
  };

	// see runDesignQuery: vessels with a mean date within margin years of the selected time will be displayed
	var timeSlider = new Slider({
		container: "time",
		min: 400,
		max: 1700,
		steps: 25,
		values: [1000],
		visibleElements: {
			labels: true,
			rangeLabels: true
		}
	});

	var marginSlider = new Slider({
		container: "margin",
		min: 0,
		max: 500,
		steps: 10,
		values: [50],
		visibleElements: {
			labels: true,
			rangeLabels: true
		}
	});	

	var queryDesigns = document.getElementById("query-designs");

	// latlon sites test data (sites only)
  //const dataURL = 'https://services5.arcgis.com/L1mg0iSh5ckmKwdF/arcgis/rest/services/latlonsites/FeatureServer';
	// first designs sites vessels 
	//const dataURL = 'https://services5.arcgis.com/L1mg0iSh5ckmKwdF/arcgis/rest/services/designs_sites_vessels/FeatureServer';
	// designs sites vessels table 2 (dorothy sent updated data)
	//const dataURL = 'https://services5.arcgis.com/L1mg0iSh5ckmKwdF/arcgis/rest/services/d_s_v/FeatureServer';
	// designs sites vessels table 3 (fixed mean date column, updated max record count)
	const dataURL = 'https://services5.arcgis.com/yVCUkdcXCabMuIIK/ArcGIS/rest/services/designs_sites_vessels/FeatureServer';

	// contains all the designs, not displayed
  var dataLayer = new FeatureLayer({
		url: dataURL,
		visible: false
  });

	var map = new Map({
		basemap: basemap
	});

	// setting up various UI elements
  var view = new MapView({
    container: 'viewDiv',
    map: map,
    center: [-112, 36],
    zoom: 6,
  });
  
	// Add a default basemap selecting widget
  var basemapGallery = new BasemapGallery({
    view: view,
    source: {
      portal: {
        url: 'https://www.arcgis.com',
        useVectorBasemaps: true, // Load vector tile basemaps
      },
    },
  });
  view.ui.add(basemapGallery, 'top-right');

  view.ui.add("infoDiv", 'bottom-right');

	// not sure how to implement the scale dependent part while using the query
	/*
  view.when().then(scaleDependent);
	function scaleDependent() {
    const layer = resultsLayer;
    
		// The following simple renderer will render all points as simple
    // markers at certain scales
    const simpleRenderer = {
      type: 'simple',
      symbol: {
        type: 'simple-marker',
        color: '#c80000',
        size: 5,
      },
    };

    // When the scale is larger than 1:92,224 (zoomed in passed that scale),
    // then switch from a heatmap renderer to a simple renderer. When zoomed
    // out beyond that scale, switch back to the heatmap renderer
    view.watch('scale', function (newValue) {
      layer.renderer = newValue <= 92224 ? simpleRenderer : heatmap;
    });
  }
	*/

	// query for designs with the specified time when the query button is clicked
	queryDesigns.addEventListener("click", function() {
		runDesignQuery().then(displayResults);
	});

	function runDesignQuery() {
		var query = dataLayer.createQuery();
		var selectedTime = timeSlider.values[0];
		var selectedMargin = marginSlider.values[0];

		// select only rows such that the mean date is within margin years of the selected time
		var earlyBound = selectedTime - selectedMargin;
		var lateBound = selectedTime + selectedMargin;
		query.where = "mean_date >= " + earlyBound + " and mean_date <= " + lateBound;
		
		// alternate method of querying the database to select only rows such that the selected time falls in between the estimated dates
		//query.where = "earliest_date <= " + selectedTime + " and latest_date >= " + selectedTime;

		return dataLayer.queryFeatures(query);
	}

	function displayResults(results) {
		//update the slider, reporting how many vessels found
		var numDesigns = results.features.length;
		document.getElementById("results").innerHTML = numDesigns + " designs found";
		
		//create a new layer with the results
		resultsLayer = new FeatureLayer({
			source: results.features,
			renderer: heatmap,
			objectIdField: "ObjectID"
		});

		//update the map with the new layer
		map.layers.removeAll();
		map.layers.add(resultsLayer);
	}

});
