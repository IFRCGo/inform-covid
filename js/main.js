createMap("map1", 'INFORM COVID-19 Risk Index', d3.schemeReds[6])
createMap("map2", 'INFORM COVID Risk Index: Vulnerability dimension', d3.schemePurples[6])
createMap("map3", 'INFORM COVID Risk Index: Hazard & Exposure dimension', d3.schemeOranges[6])
createMap("map4", 'INFORM COVID Risk Index: Lack of Coping Capacity dimension', d3.schemeGreens[6])

function positionTooltip(tooltip) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const { pageX, pageY } = d3.event;

    if (pageX > w / 2) {
        tooltip.style("right", `${w - pageX}px`)
        tooltip.style("left", "unset");
    } else {
        tooltip.style("left", `${pageX}px`)
        tooltip.style("right", "unset");
    }

    if ((pageY - window.scrollY) > h / 2) {
        tooltip.style("bottom", `${h - pageY}px`)
        tooltip.style("top", "unset");
    } else {
        tooltip.style("top", `${pageY}px`)
        tooltip.style("bottom", "unset");
    }
    
}

// create a tooltip
var tooltip = d3.select("#main")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style ("border-color", "#003246")
    .style("border-radius", "5px")
    .style("padding", "5px")

var mouseover = function (d) {
    tooltip.style("opacity", 0.9)

    if (!d3.select(this).classed("highlight")) {
        d3.select(this).attr("class", "hover");
    }
}
var mousemove = function (d, colummnId) {
    //console.log('d',d);
    tooltip.html(`<strong>${d.properties.name}</strong><br><br>${colummnId}<br><br>${d.val}`)
    positionTooltip(tooltip);
}
var mouseleave = function (d) {
    tooltip.style("opacity", 0)
    if (!d3.select(this).classed("highlight")) {
        d3.select(this).attr("class", "");
    }
}

function createMap(divId, colummnId, colorScheme) {
    var svgDiv = document.getElementById(divId).getBoundingClientRect();
    let width = svgDiv.width;
    let height = svgDiv.height;

    // colorScheme.unshift("#ccc")

    const svg = d3.select("#" + divId)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('class', 'map');


    Promise.all([
        d3.json('https://enjalot.github.io/wwsd/data/world/world-110m.geojson'),
        d3.csv('data.csv')
    ]).then(
        d => ready(null, d[0], d[1])
    );

    function ready(error, data, csvData) {
        data.features = data.features.filter(d => d.id !== "GRL" && d.id !== "ATA") //remove GRL and ATA from map 

        var projection = d3.geoMercator().fitSize([width, height], data);
        var path = d3.geoPath().projection(projection);

        const country = {};
        // console.log('csvData', csvData);
        csvData.forEach(d => { country[d.ISO3] = +d[colummnId]; });
        data.features.forEach(d => { d.val = country[d.id] });

        var colorScale = d3.scaleThreshold()
            .domain([0, 2, 4, 6, 8, 10])
            .range(colorScheme);

        svg.append('g')
            .attr('class', 'countries')
            .selectAll('path')
            .data(data.features)
            .enter().append('path')
            .attr('d', path)
            .style('fill', d => {
                // console.log('d.val', d.val);
                if (!colorScale(d.val)) {
                    return "#ccc"
                }
                return colorScale(d.val)
            })
            .style('stroke', 'white')
            .style('opacity', 0.8)
            .style('stroke-width', 0.3)
            .on("mouseover", mouseover)
            .on("mousemove", (d) => mousemove(d, colummnId))
            .on("mouseleave", mouseleave)

        //svg.append("text")
            // .attr("transform", "rotate(-90)")
           // .attr("y", 20)
          //  .attr("x", 50)
            // .attr("dy", "1em")
          //  .style("text-anchor", "middle")
         //   .text(colummnId);

        var x = d3.scaleLinear()
            .domain(colorScale.domain())
            .rangeRound([10, 50]);

        var g = svg.append("g")
            .attr("class", "key")
            .attr("transform", "translate(250, 350)");

        g.selectAll("rect")
            .data(colorScale.range().map(function(d) {
                d = colorScale.invertExtent(d);
                if (d[0] == null) d[0] = x.domain()[0];
                if (d[1] == null) d[1] = x.domain()[1];
                return d;
            }))
            .enter().append("rect")
            .attr("height", 6)
            .attr("x", function(d) { return x(d[0]); })
            .attr("width", function(d) { return Math.abs(x(d[1]) - x(d[0])); })
            .attr("fill", function(d) { return colorScale(d[0]); });

        const axisScale = d3.scaleBand()
            .domain(['Very low', 'Low', 'Medium', 'High', 'Very high'])
            .rangeRound([10, 210]);
        const axis = g.call(
            d3.axisBottom(axisScale)
                .tickSize(12)
        );
        axis.select(".domain").remove();
        axis.selectAll("line").remove();
    }
}