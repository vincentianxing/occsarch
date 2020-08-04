import pandas as pd
sites = pd.read_csv("latlonSites.csv")

sites["color"] = ""

for row in range(3,487):
    elev = sites[row,'Elevation']
    num = int(elev / 1000)
    if num == 3:
        sites[row, "color"] = "red"
    elif num == 4:
        sites[row, "color"] = "green"
    elif num == 5:
        sites[row, "color"] = "yellow"
    elif num == 6:
        sites[row, "color"] = "blue"
    else:
        sites[row, "color"] = "fuscia"

import plotly.express as px

fig = px.scatter_mapbox(sites, lat="latitude", lon="longitude", color="color", hover_name="site name", hover_data=["site desig", "mean date"],
                        zoom=6, height=800)
#fig.update_layout(mapbox_style="open-street-map")
#fig.update_layout(margin={"r":0,"t":0,"l":0,"b":0})

fig.update_layout(
    mapbox_style="white-bg",
    mapbox_layers=[
        {
            "below": 'traces',
            "sourcetype": "raster",
            "source": [
                "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"
            ]
        },
        {
            "sourcetype": "raster",
            "source": [
                "https://rmgsc.cr.usgs.gov/arcgis/rest/services/contUS/MapServer/0/tile/{z}/{y}/{x}"
            ]
        }
      ])
fig.update_layout(margin={"r":0,"t":0,"l":0,"b":0})

fig.show()
