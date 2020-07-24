mapboxgl.accessToken =
  "pk.eyJ1IjoidmluY2VudGlhbnhpbmciLCJhIjoiY2s2aXBvdzF5MDNobzNzbjh1d2J6dnZkaiJ9.0z0wbbAf0gSMvl2LFpJ5EQ";
var map = new mapboxgl.Map({
  container: "map", // container id
  style: {
    version: 8,
    sources: {
      "raster-tiles": {
        type: "raster",
        tiles: [
          "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: "USGSTopo",
        type: "raster",
        source: "raster-tiles",
        minzoom: 0,
        maxzoom: 23,
      },
    ],
  },
  center: [-112, 35], // starting position
  zoom: 4.5, // starting zoom
});
