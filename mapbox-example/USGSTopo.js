mapboxgl.accessToken =
  "pk.eyJ1IjoidmluY2VudGlhbnhpbmciLCJhIjoiY2s2aXBvdzF5MDNobzNzbjh1d2J6dnZkaiJ9.0z0wbbAf0gSMvl2LFpJ5EQ";
var map = new mapboxgl.Map({
  container: "map", // container id
  style: {
    version: 8,
    sources: {
      USGSTopo: {
        type: "raster",
        tiles: [
          "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
      },
      // govunits: {
      //   type: "geojson",
      //   data: "https://carto.nationalmap.gov/arcgis/rest/services/govunits/MapServer/dynamicLayers/query?layer={%22id%22:17}",
      // },
    },
    layers: [
      {
        id: "USGSTopo",
        type: "raster",
        source: "USGSTopo",
        minzoom: 0,
        maxzoom: 23,
      },
      // {
      //   id: "govunits",
      //   type: "symbol",
      //   source: "govunits",
      // },
    ],
  },
  center: [-112, 36], // starting position
  zoom: 4.5, // starting zoom
});

// add style from mapbox studio
// map.setStyle("mapbox://styles/vincentianxing/ckd41x4390mm51hnyu7ysv4e6");

// add contours layer
map.on("load", function () {
  map.addSource("contours", {
    type: "vector",
    url: "mapbox://mapbox.mapbox-terrain-v2",
  });
  map.addLayer({
    id: "contours",
    type: "line",
    source: "contours",
    "source-layer": "contour",
    layout: {
      // make layer visible by default
      visibility: "visible",
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#877b59",
      "line-width": 1,
    },
  });
});

map.on("load", function () {
  const layers = map.getStyle().layers;
  console.log(layers);
});
