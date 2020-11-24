require([
    'esri/views/MapView',
    'esri/widgets/Slider',
    'esri/widgets/Expand',
    'esri/layers/FeatureLayer',
    'esri/layers/GraphicsLayer',
    'esri/core/watchUtils',
    'esri/widgets/Sketch/SketchViewModel',
    'esri/geometry/Polyline',
    'esri/geometry/geometryEngine',
    'esri/Graphic',
    'esri/Basemap',
  ], function (
    MapView,
    Slider,
    Expand,
    FeatureLayer,
    GraphicsLayer,
    watchUtils,
    SketchViewModel,
    Polyline,
    geometryEngine,
    Graphic,
    Basemap
  ) {
    
    // Default renderer
    var uniqueRenderer = {
      type: 'unique-value',
      field: 'site_ID',
      defaultSymbol: { type: 'simple-marker', size: 6, color: 'white' },
    };

    // Color the sites according to the frequency of the selected symmetry
    // TODO: this makes the renderer really slow, but it works
    function updateColoring() {      
      var renderer = {
        type: 'unique-value',
        field: 'site_ID',
        defaultSymbol: { type: 'simple-marker', size: 6, color: 'white' },
        uniqueValueInfos: [],
      }
      if (selectedSymmetry !== 'All') {
        if (sites.size == 0) {
          console.error('Error: trying to update coloring before the site map has been constructed');
        }
        sites.forEach(function(site, id) {
          var frequency = site[symField].get(selectedSymmetry) / site[symField].get('All');
          var unique = {
            value: String(id),
            symbol: {
              type: 'simple-marker', 
              size: 6,
              color: assignColor(frequency),
            },
          };
          renderer.uniqueValueInfos.push(unique);
        });
      }
      dataLayer.renderer = renderer;
    }

    // works with css color names
    function assignColor(frequency) {
      if (frequency > 0.51) return 'red';
      if (frequency > 0.41) return 'orange';
      if (frequency > 0.31) return 'yellow';
      if (frequency > 0.21) return 'lightgreen';
      if (frequency > 0.11) return 'dodgerblue';
      if (frequency > 0.06) return 'orchid';
      // <5%
      return 'lightgray';
    }
  
    // defining DOM nodes and constants for the data field and data type selectors
    var symRadios = document.getElementsByName('sym-field');
    var symField = 'sym_struc';
    var symmetrySelect = document.getElementById('symmetry-type');
    var selectedSymmetry = 'All';
    const symOptions = [
      'p112',
      'pma2',
      'p1a1',
      'pmm2',
      'p1m1',
      'pm11',
      'p111',
      'p2',
      'pmg',
      'pgg',
      'p4m',
      'p4g',
      'cmm',
      'p1',
      'C1	',
      'C2',
      'C3',
      'C4',
      'D1',
      'D2',
      'D4',
      'p112\'',
      'pma\'2\'',
      'p\'b2',
      'p2\'',
      'p\'c4mm',
      'p\'bmg',
      'cmm\'',
    ];
    const colorOptions = [
      'colored',
      '1-color',
      '2-color',
    ];
    const typeOptions = [
      'Abajo R/O',
      'Awatovi B/Y',
      'Biscuit B',
      'Black Mesa B/W',
      'Chaco B/W',
      'Chapin B/W',
      'Escavada B/W',
      'Gallup B/W',
      'Gila Butte R/B',
      'Gila Poly',
      'Homolovi Poly',
      'Jeddito B/O',
      'Jeddito B/Y',
      'Kiatuthlanna B/W',
      'Mancos B/W',
      'McElmo B/W',
      'Mesa Verde B/W',
      'Mimbres B/W',
      'Piedra B/W',
      'Pinedale B/W',
      'Pinto Poly',
      'Ramos Poly',
      'Red Mesa B/W',
      'Rincon R/B',
      'Santa Cruz R/B',
      'Sacaton R/B',
      'Sankawi B/C',
      'Santa Fe B/W',
      'Sikyatki Poly',
      'St Johns Poly',
      'Tonto Poly',
      'Tularosa B/W',
      'Tusayan B/W',
      'Fourmile Poly',
      'Matsaki Poly',
      'Tanque Verde R/B',
    ].sort();

    // show a list of data types depending on the selected data field
    function updateDataTypes(field) {
      // remove existing list of data types
      while (symmetrySelect.firstChild) {
        symmetrySelect.removeChild(symmetrySelect.firstChild);
      }

      var options;
      switch(field) {
        case 'sym_design':
          options = symOptions;
          break;
        case 'sym_struc':
          options = symOptions;
          break;
        case 'band_color':
          options = colorOptions;
          break;
        case 'type':
          options = typeOptions;
          break;
        default:
          console.error('Invalid data field, expected sym_design, sym_struc, band_color, or type, instead got: ' + field);
          break;
      }
      var a = document.createElement('option');
      a.text = 'All';
      symmetrySelect.add(a);
      options.forEach(function (o) {
        var newopt = document.createElement('option');
        newopt.text = o;
        symmetrySelect.add(newopt);
      });
    }
    // call once on intitialization
    updateDataTypes(symField);
  
    var timeSlider = new Slider({
      container: 'time',
      min: 400,
      max: 1700,
      steps: 25,
      values: [1000],
      visibleElements: {
        labels: true,
        rangeLabels: true,
      },
    });

    const dataURL = 'https://services5.arcgis.com/yVCUkdcXCabMuIIK/arcgis/rest/services/11_13_Fuzzed_Sites/FeatureServer';
    var dataLayer = new FeatureLayer({
      url: dataURL,
      // outFields configured for tables of sites
      outFields: [
        'site_ID',
        'site_desig',
        'site_name',
        'earliest_date',
        'latest_date',
      ],
      popupTemplate: {
        title: 'Site ID {site_ID}',
        outFields: [
          'site_desig',
          'site_name',
          'earliest_date',
          'latest_date'
        ],
        content: setContentInfo,
      },
      renderer: uniqueRenderer,
      legendEnabled: false,
    });

    // This defines what will show up in the popup when you click on a 
    // site. Takes a Feature (arcGIS object) as input and returns an
    // HTMLElement

    function setContentInfo(feature) {
      var node = document.createElement('div');
      node.classList = 'SitePopup';

      // clean the data we get from the feature
      var attributes = feature.graphic.attributes;

      // returns an empty string if the attribute is falsy
      // we are just concerned with when it is undefined or null
      function parseAttr(attr) {
        return attr ? attr : '';
      }

      var site_ID = attributes.site_ID; // site_ID will never be null
      var site_desig = parseAttr(attributes.site_desig);
      var site_name = parseAttr(attributes.site_name);
      var earliest_date = parseAttr(attributes.earliest_date);
      var latest_date = parseAttr(attributes.latest_date);

      // table with site fields
      var siteData = '<table>' +
        '<tr><td>Site Designation</td><td>' + site_desig + '</td></tr>' + 
        '<tr><td>Site Name</td><td>' + site_name + '</td></tr>' +
        '<tr><td>Earliest Date</td><td>' + earliest_date + '</td></tr>' +
        '<tr><td>Latest Date</td><td>' + latest_date + '</td></tr>' +
        '</table>';
      // some magic to turn the above html into an HTMLElement
      var tmp = document.createElement('div');
      tmp.innerHTML = siteData;
      var table = tmp.firstChild;
      // use the default esri table formatting
      table.classList = 'esri-widget__table';
      node.appendChild(table);

      // shows fraction of designs present in the site that accord with the selected filter
      var site = sites.get(site_ID);
      var curDesigns = site[symField].get(selectedSymmetry);
      if (typeof curDesigns === 'undefined') {
        curDesigns = 0;
      }
      var totalDesigns = site[symField].get('All');
      var designData = document.createElement('div');
      designData.innerHTML = 
        '<b>' + curDesigns + '/' + totalDesigns + '</b> or <b>' + 
        (curDesigns / totalDesigns * 100).toPrecision(3) + 
        '%</b> of designs have the selected data type';
      node.appendChild(designData);

      return node;
    }
  
    // used for selection area for frequency graph
    var centerGraphic,
      edgeGraphic,
      polylineGraphic,
      bufferGraphic,
      centerGeometryAtStart,
      labelGraphic;
    const unit = 'kilometers';
  
    var graphicsLayer = new GraphicsLayer();
    var bufferLayer = new GraphicsLayer({
      blendMode: 'normal',
    });
  
    // Create basemap from the custom map
    var custom_basemap = new Basemap({
      portalItem: {
        id: '4837420847a14d32a367ad0ad1e8658d',
        // The map is currently set to public; for now, all zooming factors are acceptable, which means the visibility range is at max
      },
    });
  
    var map = {
      basemap: custom_basemap, // before we used "topo"
      layers: [dataLayer, bufferLayer, graphicsLayer],
    };
  
    var view = new MapView({
      container: 'viewDiv',
      map: map,
      center: [-108.7, 34.3],
      zoom: 6,
    });
  
    var featureLayerView;
  
    // Add the opacity slider
    var opacitySlider = new Slider({
      container: 'opacity',
      min: 0,
      max: 1,
      values: [1],
      visibleElements: {
        rangeLabels: true,
      },
    });
    opacitySlider.on(['click', 'thumb-drag', 'thumb-change'], function () {
      var opacity = opacitySlider.values[0];
      dataLayer.opacity = opacity;
      bufferLayer.opacity = opacity;
    });

    var legendExpand = new Expand({
      expandIconClass: 'esri-icon-layer-list',
      expandTooltip: 'Legend',
      expanded: true,
      view: view,
      content: document.getElementById('legendDiv'),
    })
  
    var infoExpand = new Expand({
      expandIconClass: 'esri-icon-settings',
      expanded: true,
      view: view,
      content: document.getElementById('infoDiv'),
    })
  
    var chartExpand = new Expand({
      expandIconClass: 'esri-icon-chart',
      expandTooltip: 'Symmetry Frequency Chart',
      expanded: false,
      view: view,
      content: document.getElementById('chartPanel'),
    });

    // setting up various UI elements
    view.ui.add(legendExpand, 'top-right');
    view.ui.add(infoExpand, 'bottom-right');
    view.ui.add(chartExpand, 'bottom-left');
  
    // construct a map of sites
    // key: Number siteid
    // value: Object {
    //          sym_struc: Map of associated symmetries,
    //          sym_design: ^,
    //          band_color: ^,
    //          type: ^
    //        }
    // See also getAssocSyms()
    var sites = new Map();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'Designs + Vessels.csv', true);
    xhr.overrideMimeType('text/plain');
    xhr.onreadystatechange = function() {
      if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
        // Uses Papaparse for csv parsing
        var results = Papa.parse(xhr.response, {
            header: true
        });
        for (var err of results.errors) {
            console.error('CSV parsing error: ', err);
        }
        var designs = results.data;
        dataLayer.queryFeatures().then(function(FeatureSet) {
          for (var graphic of FeatureSet.features) {
            var id = graphic.attributes.site_ID;
            sites.set(id, {
              sym_struc: getAssocSyms(designs, 'sym struc', id),
              sym_design: getAssocSyms(designs, 'sym design', id),
              band_color: getAssocSyms(designs, 'band color', id),
              type: getAssocSyms(designs, 'type', id),
            });
          }
        });
      }
    };
    xhr.send();

    // Returns a Map of symmetry occurences associates with a site id
    // key: String symmetry
    // value: Number occurences
    function getAssocSyms(designs, symfield, id) {
      var syms = new Map();
      var siteDesigns = designs.filter(design => design['site ID'] == id);
      syms.set('All', 0);
      for (var design of siteDesigns) {
        var sym = design[symfield];
        // add the sym to the list if it doesn't exist yet
        if (!syms.has(sym)) {
          syms.set(sym, 0);
        }
        // increment the occurences by 1
        syms.set(sym, syms.get(sym) + 1);
        syms.set('All', syms.get('All') + 1);
      }
      return syms;
    }
    
    // data type selector handler
    symmetrySelect.addEventListener('change', function () {
      for (var i = 0; i < symmetrySelect.options.length; i++) {
        if (symmetrySelect.options[i].selected) {
          selectedSymmetry = symmetrySelect.options[i].text;
          break;
        }
      }
      updateColoring();
      updateLayerView();
    });
  
    // data field selector handler
    symRadios.forEach(function (obj) {
      obj.addEventListener('change', function (event) {
        symField = event.target.value;
        updateDataTypes(symField);
        selectedSymmetry = 'All';
        updateColoring();
        updateLayerView();
      });
    });

    // time filter handler
    timeSlider.on(['thumb-drag', 'thumb-change', 'segment-drag'], function() {
        if (!document.getElementById('ignoreTime').checked)
          updateLayerView();
      });
    document.getElementById('ignoreTime').addEventListener('change', updateLayerView);
  
    // Things to do when the layerView first loads
    view.whenLayerView(dataLayer).then(function (layerView) {
      featureLayerView = layerView;
      watchUtils.whenFalseOnce(layerView, 'updating', function () {
          updateLayerView();
      })
  
      // create a watcher to trigger drawing of the buffer (selection area) polygon
      pausableWatchHandle = watchUtils.pausable(layerView, 'updating', function (
        val
      ) {
        if (!val) {
          drawBufferPolygon();
          updateLayerView();
        }
      });

      // Display directions when the layerView is loading
      watchUtils.whenFalseOnce(layerView, 'updating', function () {
        view.popup.open({
          title: 'Center point',
          content:
            'Drag this point to move the buffer.<br> ' +
            'Or drag the <b>Edge</b> point to resize the buffer.<br>' +
            'Click the chart icon in the bottom left to show the results.',
          location: centerGraphic.geometry,
        });
        view.popup.alignment = 'top-left';
      });
  
      // close the popup when the user clicks out of it
      view.watch('focused', function (newValue) {
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
        layer: graphicsLayer,
      });
  
      // Listen to SketchViewModel's update event so the symmetry frequency chart
      // is updated as the graphics are updated
      sketchViewModel.on('update', onMove);
    }
  
    // Edge or center graphics are being moved. Recalculate the buffer with
    // updated geometry information and run the query stats again.
    function onMove(event) {
      // If the edge graphic is moving, keep the center graphic
      // at its initial location. Only move edge graphic
      if (event.toolEventInfo && event.toolEventInfo.mover.attributes.edge) {
        const toolType = event.toolEventInfo.type;
        if (toolType === 'move-start') {
          centerGeometryAtStart = centerGraphic.geometry;
        }
        // keep the center graphic at its initial location when edge point is moving
        else if (toolType === 'move' || toolType === 'move-stop') {
          centerGraphic.geometry = centerGeometryAtStart;
        }
      }
  
      // the center or edge graphic is being moved, recalculate the buffer
      const vertices = [
        [centerGraphic.geometry.x, centerGraphic.geometry.y],
        [edgeGraphic.geometry.x, edgeGraphic.geometry.y],
      ];
  
      // client-side stats query of features that intersect the buffer
      calculateBuffer(vertices);
    }
  
    function calculateBuffer(vertices) {
      // Update the geometry of the polyline based on location of edge and center points
      polylineGraphic.geometry = new Polyline({
        paths: vertices,
        spatialReference: view.spatialReference,
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
        type: 'text',
        color: '#000000',
        text: length.toFixed(2) + ' kilometers',
        xoffset: 50,
        yoffset: 10,
        font: {
          // autocast as Font
          size: 14,
          family: 'sans-serif',
        },
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
        y: centerScreenPoint.y - 120,
      });
      const edgePoint = view.toMap({
        x: centerScreenPoint.x + 240,
        y: centerScreenPoint.y - 120,
      });
  
      // Store updated vertices
      const vertices = [
        [centerPoint.x, centerPoint.y],
        [edgePoint.x, edgePoint.y],
      ];
  
      // Create center, edge, polyline and buffer graphics for the first time
      if (!centerGraphic) {
        const polyline = new Polyline({
          paths: vertices,
          spatialReference: view.spatialReference,
        });
  
        // get the length of the initial polyline and create buffer
        const length = geometryEngine.geodesicLength(polyline, unit);
        const buffer = geometryEngine.geodesicBuffer(centerPoint, length, unit);
  
        // Create the graphics representing the line and buffer
        const pointSymbol = {
          type: 'simple-marker',
          style: 'circle',
          size: 10,
          color: [0, 255, 255, 0.5],
        };
        centerGraphic = new Graphic({
          geometry: centerPoint,
          symbol: pointSymbol,
          attributes: {
            center: 'center',
          },
        });
        edgeGraphic = new Graphic({
          geometry: edgePoint,
          symbol: pointSymbol,
          attributes: {
            edge: 'edge',
          },
        });
        polylineGraphic = new Graphic({
          geometry: polyline,
          symbol: {
            type: 'simple-line',
            color: [127, 127, 127, 1],
            width: 2,
          },
        });
        bufferGraphic = new Graphic({
          geometry: buffer,
          symbol: {
            type: 'simple-fill',
            color: [255, 255, 255, 0],
            outline: {
              color: '#000000',
              width: 2,
            },
          },
        });
        labelGraphic = labelLength(edgePoint, length);
  
        // Add graphics to layer
        graphicsLayer.addMany([
          centerGraphic,
          edgeGraphic,
          polylineGraphic,
          labelGraphic,
        ]);
        // once center and edge point graphics are added to the layer,
        // call sketch's update method pass in the graphics so that users
        // can just drag these graphics to adjust the buffer
        /*
        setTimeout(function () {
          sketchViewModel.update([edgeGraphic, centerGraphic], {
            tool: 'move',
          });
        }, 1000);
        */
  
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
          type: 'text',
          color: '#000000',
          text: length.toFixed(2) + ' kilometers',
          xoffset: 50,
          yoffset: 10,
          font: {
            // autocast as Font
            size: 14,
            family: 'sans-serif',
          },
        },
      });
    }
  
    // spatially query the feature layer view for statistics using the updated buffer polygon
    function queryLayerViewSymStats(buffer) {
      // Client-side spatial query:
      // Get a list of sites that intersect with the buffer
      const query = featureLayerView.layer.createQuery();
      query.where = getWhereClause();
      query.geometry = buffer;
  
      // Query the features on the client using FeatureLayerView.queryFeatures
      return featureLayerView
        .queryFeatures(query)
        .then(function (results) {
          // Construct an array of site IDs that intersect with the buffer
          var s = [];
          for (var graphic of results.features) {
            site = graphic.attributes;
            s.push(graphic.attributes.site_ID);
          }

          // For each site, add the symmetries in that site to data
          var newData = {};
          for (var id of s) {
            var syms = sites.get(id)[symField];
            syms.forEach(function (occurences, sym) {
              if (sym === 'All')
                return;
              if (typeof newData[sym] === 'undefined') {
                newData[sym] = occurences;
              } else {
                newData[sym] += occurences;
              }
            });
          }

          // Send newData to updateChart
          return newData;
        })
        .catch(function (error) {
          console.error(error);
          console.error("Where clause was: " + query.where);
        });
    }
  
    // Chart is created using the Chart.js library
    var chart;
    function updateChart(newData) {
      // sort the new data and prepare it for the chart
      var sorted = sortBars(newData);
      var syms = [];
      var counts = [];
      sorted.forEach(element => syms.push(element[0]));
      sorted.forEach(element => counts.push(element[1]));
  
      if (!chart) {
        // Get the canvas element and render the chart in it
        const canvasElement = document.getElementById('chart');
  
        chart = new Chart(canvasElement.getContext('2d'), {
          type: 'bar',
          data: {
            labels: syms,
            datasets: [
              {
                data: counts,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
              },
            ],
          },
          options: {
            responsive: false,
            title: {
              display: true,
              text: 'Number of Cases',
            },
            scales: {
              xAxes: [
                {
                  ticks: {
                    autoSkip: false,
                  },
                },
              ],
              yAxes: [
                {
                  ticks: {
                    beginAtZero: true,
                    precision: 0, // only label integer ticks
                  },
                  scaleLabel: {
                    display: true,
                    labelString: 'Number',
                  },
                },
              ],
            },
            legend: {
              display: false
            },
            // disable animations to improve performance
            animation: {
              duration: 0,
            },
            responsiveAnimationDuration: 0,
          },
        });
      } else {
        chart.data.labels = syms;
        chart.data.datasets[0].data = counts;
        chart.update();
      }
    }
  
    function updateLayerView() {
      if (featureLayerView === undefined) {
        return;
      }

      featureLayerView.filter = {
        where: getWhereClause(),
      };

      updateFeatureCount();

      if (bufferGraphic) {
        queryLayerViewSymStats(bufferGraphic.geometry).then(function (newData) {
          updateChart(newData);
        });
      }
    }

    // takes an object and sorts it, descending, according to the 
    // numeric value of those properties
    // returns an array of length 2 arrays, with the first element being
    // the property name and the second element being the property value
    function sortBars(bars) {
      var sortable = [];
      for (var bar in bars) {
          sortable.push([bar, bars[bar]]);
      }
      
      sortable.sort(function(a, b) {
          return b[1] - a[1];
      });

      return sortable;
    }
  
    function getWhereClause() {
      var timeClause = '';
      var symClause = '';
      if (!document.getElementById('ignoreTime').checked) {
        // select designs that could have been created in the selected year
        var timeSelection = timeSlider.values[0];
        timeClause += 'earliest_date <= ' + timeSelection + ' and latest_date >= ' + timeSelection;
      }
      
      if (timeClause !== '' && symClause !== '') {
        return timeClause + ' and ' + symClause;
      } else {
        return timeClause + symClause;
      }
    }
  
    // update the html element saying how many designs the map is showing
    async function updateFeatureCount() {
      var featureSet = await featureLayerView.queryFeatures();
      var features = featureSet.features;
      var dataPoints = 0;
      features.forEach(function(feature) {
        const site = sites.get(feature.attributes.site_ID);
        dataPoints += site[symField].get('All');
      });
      document.getElementById('results').innerHTML =
        'Displaying ' + features.length + ' sites containing ' + dataPoints + ' data points.';
    }
  });
  