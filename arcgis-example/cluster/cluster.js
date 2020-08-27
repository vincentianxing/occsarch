require([
  'esri/Map',
  'esri/views/MapView',
  'esri/Basemap',
  'esri/layers/TileLayer',
  'esri/layers/MapImageLayer',
  'esri/layers/FeatureLayer',
  'esri/layers/support/Sublayer',
  'esri/renderers/HeatmapRenderer',
  'esri/layers/support/FeatureReductionCluster',
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

  const dataURL =
    'https://services5.arcgis.com/UDWwYF0sQe2fMpOc/arcgis/rest/services/designs_sites_vessels/FeatureServer';

  var dataLayer = new FeatureLayer({
    url: dataURL,
    renderer: uniqueRenderer,
  });

  dataLayer.featureReduction = {
    type: 'cluster',
    popupTemplate: {
      content: 'This cluster represents the {cluster_type_sym_struc} symmetry.',
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
      }, //,
      //{
      // turn off deconfliction to ensure all clusters are labeled
      //deconflictionStrategy: "none",
      //labelExpressionInfo: {
      //expression: "$feature.cluster_type_sym_struc"
      //},
      //symbol: {
      //type: "text",
      //color: "white",
      //font: {
      //weight: "bold",
      //family: "Noto Sans",
      //size: "14px"
      //}
      //},
      //labelPlacement: "above-right",
      //}
    ],
  };

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
