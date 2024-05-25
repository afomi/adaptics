import * as d3 from 'd3';

export function renderForceDirectedGraph(selector, data) {
  // Set width and height for the SVG
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Create the SVG container
  const svg = d3.select(selector)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Define the force simulation
  const simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.links).id(d => d.id))
    // .force('charge', d3.forceManyBody())
    .force("charge", d3.forceManyBody().strength(d => -50 - d.degree * 15))
    .force('center', d3.forceCenter(width / 2, 200 + height / 2))
    .force("x", d3.forceX(d => (d.degree * 20)).strength(1.5))
    .force("y", d3.forceY(d => (-d.degree * 100)).strength(2.8))
    .force("custom", d3.forceRadial(d => d.degree * 360, width / 2, height / 2).strength(0.05));


  // Calculate centrality
  data.links.forEach(function (link) {
    var foundObject = data.nodes.find(function(node) {
        return node.id === link.source.id;
    });

    var foundObject2 = data.nodes.find(function(node) {
      return node.id === link.target.id;
    });

    if (foundObject) {
      foundObject.degree++;
      foundObject.degree = foundObject.degree * 1.05;
    }

    if (foundObject2) {
      foundObject2.degree++
      foundObject2.degree = foundObject2.degree * 1.05;
    }
  });

  // Create the link elements
  const link = svg.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(data.links)
    .enter()
    .append('line')
    .attr('stroke-width', d => Math.sqrt(d.value))
    .attr('stroke', 'black');

  // Create the node elements
  const node = svg
    .append("g")
    .selectAll("circle")
    .data(data.nodes)
    .enter()
    .append("circle")
    // .attr("r", 5)
    .attr("r", (d) => d.degree * 1.61) // Adjust node size based on degree centrality
    .attr("fill", "blue")
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

  node.on("mouseover", function (event, d) {
    var infoDiv = d3.select("#info");
    infoDiv
      .style("display", "block")
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY - 20 + "px")
      .html("Name: " + d.name + "<br>Description: " + d.description + "<br><br>Degree: " + d.degree);
  });

  // Set the tick function for the simulation
  simulation.nodes(data.nodes)
    .on('tick', ticked);

  simulation.force('link')
    .links(data.links);

  // Update the position of the nodes and links on each tick
  function ticked() {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
  }

  // Define drag functions
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
}
