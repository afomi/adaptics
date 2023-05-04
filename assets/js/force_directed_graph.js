import * as d3 from 'd3';

export function renderForceDirectedGraph(selector, data) {
  // Set width and height for the SVG
  const width = 800;
  const height = 600;

  // Create the SVG container
  const svg = d3.select(selector)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Define the force simulation
  const simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.links).id(d => d.id))
    .force('charge', d3.forceManyBody())
    .force('center', d3.forceCenter(width / 2, height / 2));

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
  const node = svg.append('g')
    .selectAll('circle')
    .data(data.nodes)
    .enter()
    .append('circle')
    .attr('r', 5)
    .attr('fill', 'blue')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));

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
