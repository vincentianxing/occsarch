require([
  'esri/Map',
  'esri/views/MapView',
  'esri/Basemap',
  'esri/widgets/BasemapToggle',
  'esri/widgets/BasemapGallery',
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
  TileLayer,
  MapImageLayer,
  FeatureLayer,
  Sublayer
) {
  // Create a custom basemap
  /*
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
  */

  // Create the map
  var map = new Map({
    basemap: 'topo',
  });

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

  // Add a feature layer
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
    ],
  });

  map.add(ecoLayer);
  */

  // Create tile layer from Mapserver
  // var baseLayer = new TileLayer({
  //   url:
  //     "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer",
  // });

  // map.add(baseLayer);
});
