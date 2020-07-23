import pandas as pd
sites = pd.read_csv("latlonSites.csv")

import plotly.express as px

fig = px.scatter_mapbox(sites, lat="latitude", lon="longitude", hover_name="site name", hover_data=["site desig", "mean date"],
                        color_discrete_sequence=["fuchsia"], zoom=3, height=300)
fig.update_layout(mapbox_style="open-street-map")
fig.update_layout(margin={"r":0,"t":0,"l":0,"b":0})
fig.show()
