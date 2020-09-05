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
  };
  // a constant array of common symmetries that will be colored by default
  const symmetries = [
    'p112',
    'pmm2',
    'C2',
    'p111',
    'pma2',
    'C4',
    'D2',
    'D1',
    'C1',
    'D4',
    'p2',
    'pm11',
    'p1a1',
    'C3',
    'pmg',
    'p4m',
    'asym',
    'p1m1',
    'pmm',
    'cmm',
    'pgg',
    'p1m1',
    'cmm',
  ]
  // an array of colors that will be used to color points when filtering by symmetry
  const colors = [
    'red',
    'yellow',
    'green',
    'aqua',
    'gray',
    'olive',
    'mistyrose',
    'teal',
    'lightcoral',
    'blue',
    'pink',
    'maroon',
    'fuchsia',
    'lime',
    'navy',
    'purple',
    'orange',
    'darkmagenta',
    'darkgreen',
    'darkkhaki',
    'darkolivegreen',
    'greenyellow',
    'indigo',
    'lightgreen',
    'midnightblue',
    'saddlebrown'
  ];

  // resets a layer's uniqueRenderer to an initial state
  function resetColoring(layer) {
    if (layer.renderer.type !== 'unique-value')
      return; 
    var arr = [];
    for (var i = 0; i < Math.min(symmetries.length, colors.length); i++) {
      arr.push({
        value: symmetries[i],
        symbol: {type: 'simple-marker', size: 6, color: colors[i]}
      });
    }
    layer.renderer.uniqueValueInfos = arr;
  }

  var symRadios = document.getElementsByName('sym-field');
  var symField = 'sym_struc';
  var symmetrySelect = document.getElementById('symmetry-type');
  var selectedSymmetries = ['All'];

  var timeSlider = new Slider({
    container: 'time',
    min: 400,
    max: 1700,
    steps: 25,
    values: [400, 1700],
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
  resetColoring(dataLayer);

  /* Deprecated
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
  */
  // Used only for the heatmap
  var resultsLayer = new FeatureLayer({
    source: null,
    ObjectIdField: 'ObjectID',
    renderer: heatmap
  });

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
  // Default to dot rendering
  var selectedRenderer = 'Dot';

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
    dataLayer.opacity = opacitySlider.values[0];
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

  // query all features from the dataLayer
  view.when(function() {
    return dataLayer.when(function () {
      var query = dataLayer.createQuery();
      return dataLayer.queryFeatures(query);
    });
  })
  .then(getValues)
  .then(getUniqueValues)
  .then(addToSymFilter)
  .then(function() {
    document.getElementById('hideLoading').remove();
  });

  // copied from the documentation, modified with switch statement
  // return an array of all the values in the
  // STATUS2 field of the wells layer
  function getValues(response) {
    var features = response.features;
    var values;
    switch(symField) {
      case 'sym_struc':
        values = features.map(function(feature) {
          return feature.attributes.sym_struc;
        });
        break;
      case 'sym_design':
        values = features.map(function(feature) {
          return feature.attributes.sym_design;
        })
        break;
      default:
        console.error(symField + 'is not a valid symmetry field');
        break;
    }
    return values;
  }

  // copied from the documentation
  // return an array of unique values in
  // the STATUS2 field of the wells layer
  function getUniqueValues(values) {
    var uniqueValues = [];
    values.forEach(function (item, i) {
      if (
        (uniqueValues.length < 1 || uniqueValues.indexOf(item) === -1) &&
        item !== ""
      ) {
        uniqueValues.push(item);
      }
    });
    return uniqueValues;
  }

  // add all distinct symmetries to the filter drop down
  function addToSymFilter(values) {
    values.sort();
    values.forEach(function (value) {
      var option = document.createElement("option");
      option.text = value;
      symmetrySelect.add(option);
    });
  }

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
    var queryButton = document.getElementById('query-designs');
    switch (selectedRenderer) {
      case 'Dot':
        removeClustering(dataLayer);
        resultsLayer.visible = false;
        dataLayer.visible = true;
        queryButton.style.visibility = 'hidden';
        queryButton.style.display = 'none';
        break;
      case 'Cluster':
        applyClustering(dataLayer);
        resultsLayer.visible = false;
        dataLayer.visible = true;
        queryButton.style.visibility = 'hidden';
        queryButton.style.display = 'none';
        break;
      case 'Heatmap':
        dataLayer.visible = false;
        resultsLayer.visible = true;
        queryButton.style.visibility = 'visible';
        queryButton.style.display = 'flex';
        updateHeatmap();
        break;
    }
  }

  // Update handler for the time slider
  view.whenLayerView(dataLayer).then(function (layerView) {
    // FIXME: the first time the page loads I think this executes too quickly and it says "Displaying 0 Designs" although it is actually displaying many more. 
    updateLayerView(layerView);
    // update the filter/heatmap every time the user interacts with the timeSlider
    timeSlider.on(['thumb-drag', 'thumb-change', 'segment-drag'], function timeFilter() {
      if (selectedRenderer === 'Heatmap') {
        return;
        // this is really laggy, just update on clicking the query designs button
        //updateHeatmap();
      } else {
        //Update dot/cluster map
        updateLayerView(layerView);
      }
    });
    // update the filter when the user selects a symmetry filter
    symmetrySelect.addEventListener('change', function() {
      selectedSymmetries = [];
      for (var i = 0; i < symmetrySelect.options.length; i++) {
        if (symmetrySelect.options[i].selected) {
          selectedSymmetries.push(symmetrySelect.options[i].text);
        }
      }
      updateLayerView(layerView);
    })
    // update the filter when the user changes the symmetry field
    symRadios.forEach(function(obj) {
      obj.addEventListener('change', function() {
        symField = event.target.value;
        // small bug: the layerView displays new points before the 
        // renderer applies the color change. 
        // This just results in a slight flicker of the colors
        dataLayer.renderer.field = event.target.value;
        updateLayerView(layerView);
      });
    });
  });

  function updateLayerView(layerView) {
    // select where the date is between the temporal bounds
    var earlyBound = timeSlider.values[0];
    var lateBound = timeSlider.values[1];
    var whereClause = 'mean_date >= ' + earlyBound + ' and mean_date <= ' + lateBound;
    // match where symField is equal to any of 
    // the selected symmetries in the filter drop down
    // if selectedSymmetries does not contain 'All'
    if (!selectedSymmetries.some(function (s) {
      return s === 'All'
    })) {
      var newColoring = [];
      whereClause += ' and (1 = 0 '; // just to avoid trying to remove the 'or' on i = 0

      // update coloring, SQL query for each selected symmetry
      for (var i = 0; i < selectedSymmetries.length; i++) {
        var sym = selectedSymmetries[i];

        // render each unique symmetry in a new color
        newColoring.push({
          value: sym,
          symbol: { type: 'simple-marker', size: 6, color: colors[i] },
          label: sym,
        });

        // if sym contains an apostrophe (single quote),
        // add in an additional apostrophe to escape it in the SQL query
        var apostrophe = sym.indexOf('\'');
        if (apostrophe > -1) {
          sym = sym.substring(0, apostrophe) + '\'' + sym.substring(apostrophe);
        }

        whereClause += ' or ' + symField + ' = \'' + sym + '\'';
      }
      whereClause += ')';
      // update coloring
      dataLayer.renderer.uniqueValueInfos = newColoring;

    } else {
      resetColoring(dataLayer);
    }
    layerView.filter = {
      where: whereClause
    }
    layerView.queryFeatureCount().then(function(count) {
      updateDesignCount(count);
    })
  }

  // Update handler for the query designs button
  var queryDesigns = document.getElementById('query-designs');
  queryDesigns.addEventListener('click', function() {
    if (selectedRenderer === 'Heatmap')
      updateHeatmap();
  });

  function updateHeatmap() {
    var query = dataLayer.createQuery();
    var earlyBound = timeSlider.values[0];
    var lateBound = timeSlider.values[1];
    query.where = 'mean_date >= ' + earlyBound + ' and mean_date <= ' + lateBound;
    dataLayer.queryFeatures(query).then(function(results) {
      updateDesignCount(results.features.length);
      map.layers.remove(resultsLayer);
      resultsLayer = new FeatureLayer({
        source: results.features,
        objectIdField: 'ObjectID',
        renderer: heatmap
      })
      map.layers.add(resultsLayer);
    });
  }

  function applyClustering(layer) {
    layer.featureReduction = {
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

  function removeClustering(layer) {
    layer.featureReduction = null;
  }

  // update the html element saying how many designs the map is showing
  function updateDesignCount(count) {
    document.getElementById('results').innerHTML = 'Displaying ' + count + ' designs.';
  }

});
