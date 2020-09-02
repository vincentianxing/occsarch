require([
  'esri/Map',
  'esri/views/MapView',
  'esri/Basemap',
  'esri/widgets/BasemapToggle',
  'esri/widgets/BasemapGallery',
  'esri/widgets/Slider',
  'esri/widgets/Expand',
  'esri/layers/TileLayer',
  'esri/layers/MapImageLayer',
  'esri/layers/FeatureLayer',
  'esri/layers/support/Sublayer',
  'esri/renderers/HeatmapRenderer',
], function (
  Map,
  MapView,
  Basemap,
  BasemapToggle,
  BasemapGallery,
  Slider,
  Expand,
  TileLayer,
  MapImageLayer,
  FeatureLayer,
  SubLayer,
  HeatmapRenderer
) {
  // TODO: customize the heatmap so that it looks better (change colors)
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

  // Unique-value map (dot and cluster renderers)
  /* According to ArcGIS, these are the top 10 most common sym_struc values and the number of times they occur in the database
		p112	4262
		pmm2	2366
		C2	1922
		p111	1179
		pma2	1013
		C4	863
		D1	831
		D2	801
		C1	772
		D4	598
	*/
  const uniqueRenderer = {
    type: 'unique-value',
    field: 'sym_struc',
    defaultSymbol: { type: 'simple-marker', size: 6, color: 'white' },
    // legendOptions: { title: 'Legend', view: view },
    uniqueValueInfos: [
      {
        value: 'pmm2',
        symbol: { type: 'simple-marker', size: 6, color: 'red' },
      },
      {
        value: 'p111',
        symbol: { type: 'simple-marker', size: 6, color: 'orange' },
      },
      {
        value: 'p112',
        symbol: { type: 'simple-marker', size: 6, color: 'pink' },
      },
      {
        value: 'C1',
        symbol: { type: 'simple-marker', size: 6, color: 'yellow' },
      },
      {
        value: 'C2',
        symbol: { type: 'simple-marker', size: 6, color: 'green' },
      },
      {
        value: 'D1',
        symbol: { type: 'simple-marker', size: 6, color: 'blue' },
      },
      {
        value: 'D2',
        symbol: { type: 'simple-marker', size: 6, color: 'mediumorchid' },
      },
      {
        value: 'asym',
        symbol: { type: 'simple-marker', size: 6, color: 'gray' },
        label: 'asym',
      },
    ],
  };

  // see runDesignQuery: vessels with a mean date within margin years of the selected time will be displayed
  var timeSlider = new Slider({
    container: 'time',
    min: 400,
    max: 1700,
    steps: 25,
    values: [1000, 1100],
    visibleElements: {
      labels: true,
      rangeLabels: true,
    }
  });

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
    // I (kurtis) added this, thinking maybe it makes mapping a bit faster
    // outFields configured for designs sites vessels table 3
    outFields: [
      'site_name',
      'Elevation',
      'mean_date',
      'color',
      'sym_struc',
      'sym_design',
    ],
    renderer: uniqueRenderer
  });

  const resultsFields = [
    {
      name: 'ObjectID',
      alias: 'ObjectID',
      type: 'oid'
    }, {
      name: 'site_name',
      alias: 'Site Name',
      type: 'string'
    }, {
      name: 'Elevation',
      alias: 'Elevation',
      type: 'integer'
    }, {
      name: 'mean_date',
      alias: 'Date',
      type: 'integer'
    }, {
      name: 'color',
      alias: 'Color',
      type: 'string'
    }, {
      name: 'sym_struc',
      alias: 'Symmetry Structure',
      type: 'string'
    }, {
      name: 'sym_design',
      alias: 'Symmetry Design',
      type: 'string'
    }
  ];

  var map = new Map({
    basemap: 'topo',
    layers: [dataLayer]
  });

  // setting up various UI elements
  var view = new MapView({
    container: 'viewDiv',
    map: map,
    center: [-112, 36],
    zoom: 6,
  });

  // Add the renderer selector
  const renderersElement = document.getElementById('rendererSelector');
  renderersElement.addEventListener('click', rendererChangeHandler);
  const rendererExpand = new Expand({
    view: view,
    content: renderersElement,
    group: 'top-left'
  });
  view.ui.add(rendererExpand, 'top-left');
  // Default to cluster rendering
  var selectedRenderer = 'Cluster';

  // Add the opacity slider
  var opacitySlider = new Slider({
    container: 'opacity',
    min: 0,
    max: 1,
    values: [1],
    visibleElements: {
      rangeLabels: true
    }
  });
  opacitySlider.on(['click', 'thumb-drag', 'thumb-change'], function(event) {
    if (typeof resultsLayer === 'undefined') return;
    resultsLayer.opacity = opacitySlider.values[0];
  });

  // Add a default basemap selecting widget
  /*
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
	*/

  view.ui.add('infoDiv', 'bottom-right');

  // Remove the hideLoading div when the view is finished loading
  view.when().then(function() {
    document.getElementById('hideLoading').remove();
  });

  view.whenLayerView(dataLayer).then(function (layerView) {
    // query for designs with the specified time when the query button is clicked
    var queryDesigns = document.getElementById('query-designs');
    queryDesigns.addEventListener('click', function () {
      var earlyBound = timeSlider.values[0];
      var lateBound = timeSlider.values[1];
      const whereClause = 'mean_date >= ' + earlyBound + ' and mean_date <= ' + lateBound;
      layerView.filter = {
        where: whereClause
      }
    });
  });

  /* Deprecated
  function runDesignQuery() {
    var query = dataLayer.createQuery();

    var earlyBound = timeSlider.values[0];
    var lateBound = timeSlider.values[1];
    query.where = 'mean_date >= ' + earlyBound + ' and mean_date <= ' + lateBound;

    // alternate method of querying the database to select only rows such that the selected time falls in between the estimated dates
    //query.where = "earliest_date <= " + selectedTime + " and latest_date >= " + selectedTime;

    return dataLayer.queryFeatures(query);
  }

  function displayResults(results) {
    //update the slider, reporting how many vessels found
    var numDesigns = results.features.length;
    document.getElementById('results').innerHTML =
      numDesigns + ' designs found';

    //create a new layer with the results
    resultsLayer = new FeatureLayer({
      source: results.features,
      fields: resultsFields
    });
    changeRenderer(selectedRenderer);

    //update the map with the new layer
    map.layers.removeAll();
    map.layers.add(resultsLayer);
  }
  */

  function rendererChangeHandler(event) {
    selectedRenderer = event.target.getAttribute('rendererData');
    // if the results have not been drawn yet, don't try to update the resultsLayer
    if (typeof resultsLayer === 'undefined') return;
    changeRenderer(selectedRenderer);
  }

  function changeRenderer(str) {
    switch (str) {
      case 'Dot':
        removeClustering();
        resultsLayer.renderer = uniqueRenderer;
        break;
      case 'Heatmap':
        removeClustering();
        resultsLayer.renderer = heatmap;
        break;
      case 'Cluster':
        resultsLayer.renderer = uniqueRenderer;
        applyClustering();
        break;
    }
  }

  function applyClustering() {
    resultsLayer.featureReduction = {
      type: 'cluster',
      popupTemplate: {
        content:
          'This cluster represents the {cluster_type_sym_struc} symmetry.',
      },
      labelingInfo: [
        {
          // turn off deconfliction to ensure all clusters are labeled
          deconflictionStrategy: 'none',
          labelExpressionInfo: {
            expression: "Text($feature.cluster_count, '#,###')",
          },
          symbol: {
            type: 'text',
            color: 'black',
            font: {
              weight: 'bold',
              family: 'Noto Sans',
              size: '10px',
            },
          },
          labelPlacement: 'center-center',
        },
      ],
    };
  }

  function removeClustering() {
    resultsLayer.featureReduction = null;
  }
});
