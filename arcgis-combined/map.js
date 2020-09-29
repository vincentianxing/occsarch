require([
  'esri/Map',
  'esri/views/MapView',
  'esri/widgets/BasemapGallery',
  'esri/widgets/Slider',
  'esri/widgets/Expand',
  'esri/widgets/Legend',
  'esri/layers/FeatureLayer',
  'esri/layers/GraphicsLayer',
  'esri/core/watchUtils',
  'esri/widgets/Sketch/SketchViewModel',
  'esri/geometry/Polyline',
  'esri/geometry/geometryEngine',
  'esri/Graphic',
], function (
  Map,
  MapView,
  BasemapGallery,
  Slider,
  Expand,
  Legend,
  FeatureLayer,
  GraphicsLayer,
  watchUtils,
  SketchViewModel,
  Polyline,
  geometryEngine,
  Graphic,
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
  const uniqueRenderer = {
    type: 'unique-value',
    field: 'sym_struc',
    defaultSymbol: { type: 'simple-marker', size: 6, color: 'white' },
    legendOptions: { title: 'Symmetry' }
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
    layer.renderer = uniqueRenderer;
    layer.renderer.uniqueValueInfos = arr;
    // not sure why this fixes it, but without it, the clusters just stay white
    if (selectedRenderer === 'Cluster')
      applyClustering(dataLayer);
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
      'site_ID',
      'site_name',
      'Elevation',
      'mean_date',
      'color',
      'sym_struc',
      'sym_design',
    ],
    popupTemplate: {
      // TODO: what do we title each design? By site name? or by id?
      title: 'Title',
      content: [{
        type: 'fields',
        fieldInfos: [
          {fieldName: 'site_ID'},
          {fieldName: 'site_name'},
          {fieldName: 'Elevation'},
          {fieldName: 'mean_date'},
          {fieldName: 'color'},
          {fieldName: 'sym_struc'},
          {fieldName: 'sym_design'},
        ]
      }]
    },
    legendEnabled: true,
    renderer: uniqueRenderer
  });

  // used for selection area for frequency graph
  var centerGraphic,
  edgeGraphic,
  polylineGraphic,
  bufferGraphic,
  centerGeometryAtStart,
  labelGraphic;
const unit = 'kilometers';

  // Used only for the heatmap
  var resultsLayer = new FeatureLayer({
    source: null,
    ObjectIdField: 'ObjectID',
    renderer: heatmap
  });

  var graphicsLayer = new GraphicsLayer();
  var bufferLayer = new GraphicsLayer({
    blendMode: 'color-burn'
  });

  var map = new Map({
    basemap: 'topo',
    layers: [dataLayer, bufferLayer, graphicsLayer]
  });

  var view = new MapView({
    container: 'viewDiv',
    map: map,
    center: [-108, 35.3],
    zoom: 7,
  });

  var featureLayerView;

  // Add the renderer selector
  const renderersElement = document.getElementById('rendererSelector');
  renderersElement.addEventListener('click', rendererChangeHandler);
  const rendererExpand = new Expand({
    view: view,
    content: renderersElement,
    group: 'top-left'
  });
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
	*/

  const legend = new Legend({
    view: view,
    container: 'legendDiv',
    layerInfos: [{
      layer: dataLayer,
      title: 'Legend'
    }]
  });

  var chartExpand = new Expand({
    expandIconClass: "esri-icon-chart",
    expandTooltip: "Symmetry Frequency Chart",
    expanded: false,
    view: view,
    content: document.getElementById("chartPanel")
  })

  // setting up various UI elements
  view.ui.add(rendererExpand, 'top-left');
  view.ui.add(legend, 'top-right');
  // view.ui.add(basemapGallery, 'top-right');
  view.ui.add('infoDiv', 'bottom-right');
  view.ui.add(chartExpand, 'bottom-left');

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
    resetColoring(dataLayer);
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
    featureLayerView = layerView;
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

    // create a watcher to trigger drawing of the buffer (selection area) polygon
    pausableWatchHandle = watchUtils.pausable(
      layerView,
      'updating',
      function (val) {
        if (!val) {
          drawBufferPolygon();
        }
      }
    );

    // Display directions when the layerView is loading
    watchUtils.whenFalseOnce(layerView, "updating", function () {
      view.popup.open({
        title: "Center point",
        content:
          "Drag this point to move the buffer.<br/> " +
          "Or drag the <b>Edge</b> point to resize the buffer.",
        location: centerGraphic.geometry
      });
      view.popup.alignment = "top-left";
    });

    // close the popup when the user clicks out of it
    view.watch('focused', function(newValue) {
      if (newValue) {
        view.popup.close();
      }
    });
  });

  setUpSketch();

  // Create SketchViewModel and wire up event listeners
  function setUpSketch() {
    sketchViewModel = new SketchViewModel({
      view: view,
      layer: graphicsLayer
    });

    // Listen to SketchViewModel's update event so the symmetry frequency chart
    // is updated as the graphics are updated
    sketchViewModel.on("update", onMove);
  }


  // Edge or center graphics are being moved. Recalculate the buffer with
  // updated geometry information and run the query stats again.
  function onMove(event) {
    // If the edge graphic is moving, keep the center graphic
    // at its initial location. Only move edge graphic
    if (
      event.toolEventInfo &&
      event.toolEventInfo.mover.attributes.edge
    ) {
      const toolType = event.toolEventInfo.type;
      if (toolType === "move-start") {
        centerGeometryAtStart = centerGraphic.geometry;
      }
      // keep the center graphic at its initial location when edge point is moving
      else if (toolType === "move" || toolType === "move-stop") {
        centerGraphic.geometry = centerGeometryAtStart;
      }
    }

    // the center or edge graphic is being moved, recalculate the buffer
    const vertices = [
      [centerGraphic.geometry.x, centerGraphic.geometry.y],
      [edgeGraphic.geometry.x, edgeGraphic.geometry.y]
    ];

    // client-side stats query of features that intersect the buffer
    calculateBuffer(vertices);

    // user is clicking on the view... call update method with the center and edge graphics
    if (event.state === "complete") {
      sketchViewModel.update([edgeGraphic, centerGraphic], {
        tool: "move"
      });
    }
  }

  function calculateBuffer(vertices) {
    // Update the geometry of the polyline based on location of edge and center points
    polylineGraphic.geometry = new Polyline({
      paths: vertices,
      spatialReference: view.spatialReference
    });

    // Recalculate the polyline length and buffer polygon
    const length = geometryEngine.geodesicLength(
      polylineGraphic.geometry,
      unit
    );
    const buffer = geometryEngine.geodesicBuffer(
      centerGraphic.geometry,
      length,
      unit
    );

    // Update the buffer polygon
    bufferGraphic.geometry = buffer;

    // Query symmetry frequency of features that intersect the buffer polygon
    queryLayerViewSymStats(buffer).then(function (newData) {
      // Create a frequency chart from the returned result
      updateChart(newData);
    });

    // Update label graphic to show the length of the polyline
    labelGraphic.geometry = edgeGraphic.geometry;
    labelGraphic.symbol = {
      type: "text",
      color: "#000000",
      text: length.toFixed(2) + " kilometers",
      xoffset: 50,
      yoffset: 10,
      font: {
        // autocast as Font
        size: 14,
        family: "sans-serif"
      }
    };
  }
  
  // draw the buffer polygon when the view loads
  function drawBufferPolygon() {
    // When pause() is called on the watch handle, the callback represented by the
    // watch is no longer invoked, but is still available for later use
    // this watch handle will be resumed when user searches for a new location
    pausableWatchHandle.pause();

    // Initial location for the center, edge and polylines on the view
    const viewCenter = view.center.clone();
    const centerScreenPoint = view.toScreen(viewCenter);
    const centerPoint = view.toMap({
      x: centerScreenPoint.x + 120,
      y: centerScreenPoint.y - 120
    });
    const edgePoint = view.toMap({
      x: centerScreenPoint.x + 240,
      y: centerScreenPoint.y - 120
    });

    // Store updated vertices
    const vertices = [
      [centerPoint.x, centerPoint.y],
      [edgePoint.x, edgePoint.y]
    ];

    // Create center, edge, polyline and buffer graphics for the first time
    if (!centerGraphic) {
      const polyline = new Polyline({
        paths: vertices,
        spatialReference: view.spatialReference
      });

      // get the length of the initial polyline and create buffer
      const length = geometryEngine.geodesicLength(polyline, unit);
      const buffer = geometryEngine.geodesicBuffer(
        centerPoint,
        length,
        unit
      );

      // Create the graphics representing the line and buffer
      const pointSymbol = {
        type: "simple-marker",
        style: "circle",
        size: 10,
        color: [0, 255, 255, 0.5]
      };
      centerGraphic = new Graphic({
        geometry: centerPoint,
        symbol: pointSymbol,
        attributes: {
          center: "center"
        }
      });

      edgeGraphic = new Graphic({
        geometry: edgePoint,
        symbol: pointSymbol,
        attributes: {
          edge: "edge"
        }
      });

      polylineGraphic = new Graphic({
        geometry: polyline,
        symbol: {
          type: "simple-line",
          color: [254, 254, 254, 1],
          width: 2.5
        }
      });

      bufferGraphic = new Graphic({
        geometry: buffer,
        symbol: {
          type: "simple-fill",
          color: [150, 150, 150],
          outline: {
            color: "#000000",
            width: 2
          }
        }
      });
      labelGraphic = labelLength(edgePoint, length);

      // Add graphics to layer
      graphicsLayer.addMany([
        centerGraphic,
        edgeGraphic,
        polylineGraphic,
        labelGraphic
      ]);
      // once center and edge point graphics are added to the layer,
      // call sketch's update method pass in the graphics so that users
      // can just drag these graphics to adjust the buffer
      setTimeout(function () {
        sketchViewModel.update([edgeGraphic, centerGraphic], {
          tool: "move"
        });
      }, 1000);

      bufferLayer.addMany([bufferGraphic]);
    }
    // Move the center and edge graphics to the new location returned from search
    else {
      centerGraphic.geometry = centerPoint;
      edgeGraphic.geometry = edgePoint;
    }

    // Query features that intersect the buffer
    calculateBuffer(vertices);
  }

  // Label polyline with its length
  function labelLength(geom, length) {
    return new Graphic({
      geometry: geom,
      symbol: {
        type: "text",
        color: "#000000",
        text: length.toFixed(2) + " kilometers",
        xoffset: 50,
        yoffset: 10,
        font: {
          // autocast as Font
          size: 14,
          family: "sans-serif"
        }
      }
    });
  }

  // spatially query the feature layer view for statistics using the updated buffer polygon
  function queryLayerViewSymStats(buffer) {
    // Data storage for the chart
    let syms = [];
    let counts = [];

    // Client-side spatial query:
    // Get a sum of age groups for census tracts that intersect the polygon buffer
    const query = featureLayerView.layer.createQuery();
    //TODO: take into account selected symmetries filter and time filter when drawing graph
    //TODO: order by symField_TOTAL descending
    query.groupByFieldsForStatistics = symField;
    query.outStatistics = {
      onStatisticField: symField,
      outStatisticFieldName: symField + "_TOTAL",
      statisticType: "count"
    };
    query.geometry = buffer;

    // Query the features on the client using FeatureLayerView.queryFeatures
    return featureLayerView
      .queryFeatures(query)
      .then(function (results) {
        // Loop through attributes and save the values for use in the frequency chart
        for (var graphic of results.features) {
          row = graphic.attributes;
          for (var property in row) {
            if (property.includes('TOTAL')) {
              counts.push(row[property]);
            } else {
              syms.push(row[property]);
            }
          }
        }
        return [syms, counts];
      })
      .catch(function (error) {
        console.log(error);
      });
  }

  // Create an population pyramid chart for the census tracts that intersect the buffer polygon
  // Chart is created using the Chart.js library
  var chart;
  function updateChart(newData) {
    var syms = newData[0];
    var counts = newData[1];

    chartExpand.expanded = true;

    // TODO: improve chart formatting
    if (!chart) {
      // Get the canvas element and render the chart in it
      const canvasElement = document.getElementById('chart');

      chart = new Chart(canvasElement.getContext("2d"), {
        type: 'bar',
        data: {
          labels: syms,
          datasets: [{
            label: 'Occurences',
            data: counts,
            backgroundColor: 'rgba(0, 0, 0, 0.4)'
          }]
        },
        options: {
          responsive: false,
          title: {
            display: true,
            text: 'Symmetry Occurences'
          },
          scales: {
            xAxes: [{
              autoSkip: false
            }],
            yAxes: [{
              min: 0,
              scaleLabel: {
                display: true,
                labelString: 'Occurences'
              }
            }],
          },
          animation: {
            duration: 0
          },
          responsiveAnimationDuration: 0
        }
      });
    } else {
      chart.data.labels = syms;
      chart.data.datasets[0].data = counts;
      chart.update();
    }
  }

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
      dataLayer.renderer = uniqueRenderer;
      dataLayer.renderer.uniqueValueInfos = newColoring;
      // not sure why this fixes it, but without it, the clusters just stay white
      if (selectedRenderer === 'Cluster')
        applyClustering(dataLayer);

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
