require([
  "esri/Map",
  "esri/views/MapView",
  "esri/Basemap",
  "esri/widgets/BasemapToggle",
  "esri/widgets/BasemapGallery",
  "esri/layers/TileLayer",
  "esri/layers/MapImageLayer",
  "esri/layers/FeatureLayer",
  "esri/layers/support/Sublayer",
  "esri/renderers/HeatmapRenderer",
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
  var basemap = new Basemap({
    baseLayers: [
      new TileLayer({
        url:
          "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer",
        title: "Basemap",
      }),
    ],
    title: "basemap",
    id: "basemap",
  });

  // Create the map
  var map = new Map({
    basemap: basemap,
  });

  var view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-112, 36],
    zoom: 6,
  });

  // Add a default basemap selecting widget
  var basemapGallery = new BasemapGallery({
    view: view,
    source: {
      portal: {
        url: "https://www.arcgis.com",
        useVectorBasemaps: true, // Load vector tile basemaps
      },
    },
  });

  view.ui.add(basemapGallery, "top-right");

  // Add a feature layer
  var ecoLayer = new MapImageLayer({
    url: "https://rmgsc.cr.usgs.gov/arcgis/rest/services/contUS/MapServer",
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

  const renderer = {
    type: "heatmap",
    colorStops: [
      { color: "rgba(63, 40, 102, 0)", ratio: 0 },
      { color: "#472b77", ratio: 0.083 },
      { color: "#4e2d87", ratio: 0.166 },
      { color: "#563098", ratio: 0.249 },
      { color: "#5d32a8", ratio: 0.332 },
      { color: "#6735be", ratio: 0.415 },
      { color: "#7139d4", ratio: 0.498 },
      { color: "#7b3ce9", ratio: 0.581 },
      { color: "#853fff", ratio: 0.664 },
      { color: "#a46fbf", ratio: 0.747 },
      { color: "#c29f80", ratio: 0.83 },
      { color: "#e0cf40", ratio: 0.913 },
      { color: "#ffff00", ratio: 1 }
    ],
    maxPixelIntensity: 25,
    minPixelIntensity: 0
  };

  const datalayer = new FeatureLayer({
    // URL to the service
    //old csv
    //url: "https://services5.arcgis.com/L1mg0iSh5ckmKwdF/arcgis/rest/services/latlonsites/FeatureServer",

    //new csv 
    url: "https://services5.arcgis.com/L1mg0iSh5ckmKwdF/arcgis/rest/services/designs_sites_vessels/FeatureServer",
    renderer: renderer
  });

  map.add(datalayer);

  view.when().then(function() {
    // When the view is ready, clone the heatmap renderer
    // from the only layer in the web map
  
    const layer = datalayer;
    const heatmapRenderer = datalayer.renderer.clone();
  
    // The following simple renderer will render all points as simple
    // markers at certain scales
  
    const simpleRenderer = {
      type: "simple",
      symbol: {
        type: "simple-marker",
        color: "#c80000",
        size: 5
      }
    };
  
    // When the scale is larger than 1:92,224 (zoomed in passed that scale),
    // then switch from a heatmap renderer to a simple renderer. When zoomed
    // out beyond that scale, switch back to the heatmap renderer
  
    view.watch("scale", function(newValue) {
      layer.renderer = newValue <= 92224 ? simpleRenderer : heatmapRenderer;
    });
  });

  // Create tile layer from Mapserver
  // var baseLayer = new TileLayer({
  //   url:
  //     "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer",
  // });

  // map.add(baseLayer);
});
