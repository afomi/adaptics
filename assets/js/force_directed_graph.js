import * as d3 from 'd3';

export function renderForceDirectedGraph(selector, data) {
  // Set width and height for the SVG
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Create the SVG container
  const svg = d3
    .select(selector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Define the force simulation
  const simulation = d3
    .forceSimulation(data.nodes)
    .force(
      "link",
      d3.forceLink(data.links).id((d) => d.id)
    )
    // .force('charge', d3.forceManyBody())
    .force(
      "charge",
      d3.forceManyBody().strength((d) => -1 - d.degree * 15)
    )
    .force("center", d3.forceCenter(width / 2, 160 + height / 2))
    .force("x", d3.forceX((d) => d.degree * 0).strength(0.4))
    .force("y", d3.forceY((d) => -d.degree * 80).strength(0.6))
    .force(
      "custom",
      d3
        .forceRadial((d) => d.degree * 360, width / 2, height / 2)
        .strength(0.05)
    );

  // Calculate centrality
  data.links.forEach(function (link) {
    var foundObject = data.nodes.find(function (node) {
      return node.id === link.source.id;
    });

    var foundObject2 = data.nodes.find(function (node) {
      return node.id === link.target.id;
    });

    if (foundObject) {
      foundObject.degree++;
      foundObject.degree = foundObject.degree * 1.05;
    }

    if (foundObject2) {
      foundObject2.degree++;
      foundObject2.degree = foundObject2.degree * 1.05;
    }
  });

  // Create the link elements
  const link = svg
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(data.links)
    .enter()
    .append("line")
    .attr("stroke-width", (d) => Math.sqrt(d.value))
    .attr("stroke", "black");

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


  function updateDisplay(d) {
    var container = document.getElementById("highlighted-nodes");

    var li = new Document.Ele
  }

  // Create an adjacency list
  var adjacencyList = {};
  window.data.links.forEach(function (link) {
    if (!adjacencyList[link.source.id]) adjacencyList[link.source.id] = [];
    if (!adjacencyList[link.target.id]) adjacencyList[link.target.id] = [];
    adjacencyList[link.source.id].push(link.target.id);
    adjacencyList[link.target.id].push(link.source.id);
  });

  node.on("mouseover", function (event, d) {
    var infoDiv = d3.select("#info");
    infoDiv
      .style("display", "block")
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY - 20 + "px")
      .html(
        "Name: " +
          d.name +
          "<br>Description: " +
          d.description +
          "<br><br>Degree: " +
          d.degree
      );

    d3.select(this).attr("stroke", "black").attr("stroke-width", 5);
    d3.select(this).attr("fill", "green").attr("stroke-width", 5);

    // updateDisplay(d);

    // Highlight the connected links and nodes
    // link.style("stroke-opacity", function (l) {
    //   return l.source.id === d.id || l.target.id === d.id ? 1 : 0.1;
    // });
    // node.style("opacity", function (n) {
    //   if (n.id === d.id) {
    //     return true;
    //   }
    //   return connected(d, n) ? 1 : 0.1;
    // });

    // Get nodes up to 3 degrees away
    var connectedNodes = bfs(d.id, 2);

    // Find and display the connected links
    var connectedLinks = window.data.links.filter(function (l) {
      return l.source.id === d.id || l.target.id === d.id;
    });


    var foundObjects = [];

    var linkInfoDiv = document.getElementById("link-info");
    linkInfoDiv.innerHTML = "";
    connectedLinks.forEach(function (l) {
      var foundObject = window.data.nodes.find(function (node) {
        return node.id === l.source.id || node.id === l.target.id;
      });
      foundObjects.push(foundObject)
    });

    // de-deduplicate nodes
    var uniqueNodes = Array.from(new Set(foundObjects));

    // loop throgh unique nodes and write them to screen, in the sidebar
    uniqueNodes.forEach(function (foundObject) {
      var originalElement = document.getElementById("sample-item");
      var clonedElement = originalElement.cloneNode(true)
      clonedElement.removeAttribute("id")
      clonedElement.className = ""

      console.log("clonedElement", clonedElement);
      var a = clonedElement.querySelector("a .truncate");
      a.innerHTML = foundObject.name;
      linkInfoDiv.append(clonedElement);
    });


    // Highlight the connected links and nodes
    link.style("stroke-opacity", function (l) {
      return connectedNodes.has(l.source.id) && connectedNodes.has(l.target.id)
        ? 1
        : 0.1;
    });
    node.style("opacity", function (n) {
      return connectedNodes.has(n.id) ? 1 : 0.1;
    });
  });

  node.on("mouseout", function (event, d) {
    d3.select(this).attr("stroke", null).attr("stroke-width", null);
    link.style("stroke-opacity", 1);
    node.style("opacity", 1);

    d3.select(this).attr("fill", "green").attr("stroke-width", 5);
  });

  function connected(a, b) {
    return data.links.some(function (l) {
      return (
        (l.source.id === a.id && l.target.id === b.id) ||
        (l.source.id === b.id && l.target.id === a.id)
      );
    });
  }

  // Set the tick function for the simulation
  simulation.nodes(data.nodes).on("tick", ticked);

  simulation.force("link").links(data.links);

  // Update the position of the nodes and links on each tick
  function ticked() {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
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

  // Breadth-First Search to find nodes up to `maxDepth` connections away
  function bfs(startId, maxDepth) {
    var visited = new Set();
    var queue = [{ id: startId, depth: 0 }];
    visited.add(startId);

    while (queue.length > 0) {
      var current = queue.shift();
      if (current.depth < maxDepth) {
        var neighbors = adjacencyList[current.id] || [];
        neighbors.forEach(function (neighbor) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push({ id: neighbor, depth: current.depth + 1 });
          }
        });
      }
    }
    return visited;
  }
}
