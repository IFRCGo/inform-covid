/* GLOBAL VARIABLES */
var world;
var leafletMaps = [];
var columnIds = [];
var noHoverText = "Hover for details"

/* HELPER FUNCTIONS */
var f = d3.format(".1f")
d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this);
  });
};
d3.selection.prototype.moveToBack = function () {
  return this.each(function () {
    var firstChild = this.parentNode.firstChild;
    if (firstChild) {
      this.parentNode.insertBefore(this, firstChild);
    }
  });
};
function handleMouseover(d) {
  if (d3.select(this).classed("admin__focus") === false) {
    d3.selectAll(".admin__focus").classed("admin__focus", false);
    d3.selectAll(".admin__default").filter(function (selected) {
      return d.properties.iso === selected.properties.iso
    })
      .classed("admin__focus", true)
      .moveToFront();
    columnIds.forEach(function (column) {
      var searchClass = '.details.' + column;
      var infoHtml = ''
      if (!!d.properties.inform) {
        infoHtml = d.properties.inform.COUNTRY + " - score: " + f(d.properties.inform[column]);
      } else {
        infoHtml = d.properties.name + " - INFORM score not available";
      }
      d3.select(searchClass).html(infoHtml)
    });
  }
}
function handleMouseout(d) {
  d3.selectAll(".admin__focus").classed("admin__focus", false);
  columnIds.forEach(function (column) {
    var searchClass = '.details.' + column;
    var infoHtml = noHoverText;
    d3.select(searchClass).html(infoHtml)
  })
}

/* BUILD THE PAGE */
// fetch all data and wait until we have it to move to the next step
Promise.all([
  d3.json('./data/ne_50m-simpler-topo.json'),
  d3.csv('./data/data.csv')
]).then(
  d => init(null, d[0], d[1])
);

function init(err, geoFetched, informFetched) {
  // stash our data as globally accessible variables
  world = topojson.feature(geoFetched, geoFetched.objects.world).features;
  // attach our inform data to our geo data
  world.forEach(function (admin) {
    admin.properties.inform = null;
    informFetched.forEach(function (risk) {
      if (risk.ISO3 === admin.properties.iso) {
        admin.properties.inform = risk;
      }
    });
  });

  Promise.all([
    // create our 4 maps
    createMap("mapIndex", 'riskIndex', d3.schemeReds[5], [2.0, 3.5, 5.0, 6.5]),
    createMap("mapVulnerability", 'vulnerabilityDimension', d3.schemePurples[5], [2.0, 3.2, 4.8, 6.4]),
    createMap("mapHazard", 'hazardDimension', d3.schemeOranges[5], [1.5, 2.7, 4.1, 6.1]),
    createMap("mapCoping", 'copingDimension', d3.schemeGreens[5], [3.2, 4.7, 6.0, 7.4]),
    createMap("mapCovidVulnerability", 'covidVulnerability', d3.schemeBlues[5], [2.0, 3.2, 4.8, 6.4]),
    createMap("mapHazardIndependentVulnerability", 'hazardIndependentVulnerability', d3.schemeBlues[5], [2.0, 3.2, 4.8, 6.4])
  ]).then(function () {
    // sync up the movement of the four maps
    for (i = 0; i < leafletMaps.length; i++) {
      for (n = 0; n < leafletMaps.length; n++) {
        if (i !== n) {
          leafletMaps[i].sync(leafletMaps[n]);
        }
      }
    }
  });
}

function createMap(divId, columnId, colorScheme, colorDomain) {
  return new Promise(function (resolve, reject) {
    // store the columnId in an Array, we'll use it when populating info boxes on hover 
    columnIds = columnIds.concat(columnId);
    // initialize a leaflet map
    var map = L.map(divId).setView([20, 25], 1);
    // add an info box to show info on hover 
    var info = L.control();
    info.onAdd = function (map) {
      this._div = L.DomUtil.create('div', 'info');
      this._div.innerHTML = '<span class="details ' + columnId + '">' + noHoverText + '</span>';
      return this._div;
    };
    info.addTo(map);
    // these functions let us use d3 to draw features on the leaflet map
    function projectPoint(x, y) {
      var point = map.latLngToLayerPoint(new L.LatLng(y, x));
      this.stream.point(point.x, point.y);
    }
    var transform = d3.geoTransform({ point: projectPoint });
    var path = d3.geoPath().projection(transform);
    // use leaflet to add an SVG layer to each map object
    L.svg().addTo(map);
    // stash the leaflet map object 
    // so we can access it later outside of this function
    leafletMaps = leafletMaps.concat(map);
    // pick up the SVGs from the map objects
    var svg = d3.select('#' + divId).select('svg');
    var geoGroup = svg.append('g').attr('id', 'geo-' + divId);
    // make sure the relevant inform data is stored as integer not string
    world.forEach(function (d) {
      if (!!d.properties.inform) {
        d.properties.inform[columnId] = +d.properties.inform[columnId];
      }
    });
    // set up our color scale
    // https://github.com/d3/d3-scale#scaleThreshold
    var colorScale = d3.scaleThreshold()
      .domain(colorDomain)
      .range(colorScheme);
    // draw the admin areas on the map
    var admins = geoGroup.selectAll("path")
      // .data(sectorJoin, function(d){ return d.properties.ID; })
      .data(world)
      .enter().append("path")
      .attr("class", "admin__default")
      .style("fill", function (d) {
        if (!!d.properties.inform) {
          return colorScale(d.properties.inform[columnId]);
        }
      })
      .attr("d", path)
      .on("mouseover", handleMouseover)
      .on("mouseout", handleMouseout)

    // if the map changes we need to redraw the admin areas
    updatePath = function () { admins.attr("d", path); }
    map.on('zoom move viewreset', updatePath);
    updatePath();

    d3.select(".legend.row." + divId).selectAll('div').data(colorScheme)
      .enter().append('div')
      .attr('class', "col px-0")
      .html(function (d) {
        return '<div style="height: 10px; background-color:' + d + '">&nbsp;</div>'
      })
    d3.select(".legend.row." + divId + " .col:first-child")
      .classed('px-0', false)
      .classed('pr-0', true)
    // .select('div').html('<span class="legendText first">Very low</span>')

    d3.select(".legend.row." + divId + " .col:last-child")
      .classed('px-0', false)
      .classed('pl-0', true)
    // .select('div').html('<span class="legendText last">Very high</span>')

    resolve();
  })
}
