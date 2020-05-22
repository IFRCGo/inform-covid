# %%
import pandas as pd
from plotly.subplots import make_subplots
import plotly.graph_objects as go
import plotly.io as pio
pio.templates.default = "plotly_white"

import re
from pathlib import Path

# %%
df = pd.read_csv("../data/data.csv")
df["all_countries"] = "All Countries"
df.head()


# %%
def correlate_covid(df):
    correlation_covid = df["covidVulnerability"].corr(df["vulnerabilityDimension"])
    return correlation_covid

def correlate_hazardindependent(df):
    correlation_covid = df["hazardIndependentVulnerability"].corr(df["vulnerabilityDimension"])
    return correlation_covid


# %%
fig = make_subplots(rows=1, cols=3)
fig = fig.update_layout(barmode='group')
for i, column in enumerate(["all_countries","wbIncomeGroup","region"]):
    covid = df.groupby(column).apply(correlate_covid).to_frame().rename(columns={0:"covid"})
    hazard = df.groupby(column).apply(correlate_hazardindependent).to_frame().rename(columns={0:"hazard"})

    corr = covid.join(hazard)
    if column == "wbIncomeGroup":
        corr = corr.loc[["Low income","Lower middle income","Upper middle income","High income: OECD","High income: nonOECD"],:]

    fig = fig.update_yaxes(title_text="Correlation", range=[0,1])
    showlegend = column == "region"
    fig = fig.add_trace(go.Bar(name='Covid-19 Vulnerability vs Vulnerability', x=corr.index, y=corr.covid, marker_color="steelblue", showlegend=showlegend),row=1,col=i+1)
    fig = fig.add_trace(go.Bar(name='Hazard-independent Vulnerability vs Vulnerability', x=corr.index, y=corr.hazard, marker_color="firebrick", showlegend=showlegend),row=1,col=i+1)
    
fig = fig.update_layout(
    legend=dict(
        x=0.75,
        y=0.95,
        traceorder="normal",
        borderwidth=1
    )
)

html = fig.to_html(include_plotlyjs="cdn")
text = re.search('\[\{"marker":[^;]+;',html)[0]
js = f"""window.PLOTLYENV=window.PLOTLYENV || {{}};
    if (document.getElementById("plotly_plot")) {{
    Plotly.newPlot('plotly_plot',
    {text}\n"""
js_path = Path("../js/barcharts.js")
js_path.write_text(js)
