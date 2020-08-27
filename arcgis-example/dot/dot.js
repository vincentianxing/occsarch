require([
  'esri/Map',
  'esri/views/MapView',
  'esri/Basemap',
  'esri/layers/TileLayer',
  'esri/layers/MapImageLayer',
  'esri/layers/FeatureLayer',
  'esri/layers/support/Sublayer',
  'esri/renderers/HeatmapRenderer',
], function (
  Map,
  MapView,
  Basemap,
  TileLayer,
  MapImageLayer,
  FeatureLayer,
  HeatmapRenderer,
  Sublayer
) {
  // Simple map (UNUSED)
  const renderer = {
    type: 'simple',
    symbol: {
      type: 'simple-marker',
      size: 6,
      color: 'black',
    },
    /*
    visualVariables: [
      {
        type: 'color',
        field: 'sym_struc',
        stops: [
          { value: 'p111', color: 'red' },
          { value: 'p112' },
          { value: 'C1' },
          { value: 'C2' },
          { value: 'D1' },
          { value: 'D2' },
          { value: 'p2' },
          { value: 'asym' },
        ],
      },
    ],
    */
  };

  // Unique-value map
  const uniqueRenderer = {
    type: 'unique-value',
    field: 'sym_struc',
    defaultSymbol: { type: 'simple-marker', size: 6, color: 'black' },
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
        symbol: { type: 'simple-marker', size: 6, color: 'purple' },
      },
      {
        value: 'asym',
        symbol: { type: 'simple-marker', size: 6, color: 'gray' },
        label: 'asym',
      },
    ],
  };

  const dataURL =
    'https://services5.arcgis.com/UDWwYF0sQe2fMpOc/arcgis/rest/services/designs_sites_vessels/FeatureServer';

  var dataLayer = new FeatureLayer({
    url: dataURL,
    renderer: uniqueRenderer,
  });

  var map = new Map({
    // basemap: 'gray-vector',
    basemap: 'topo',
    layers: [dataLayer],
  });

  var view = new MapView({
    container: 'viewDiv',
    map: map,
    center: [-112, 36],
    zoom: 6,
  });
});
