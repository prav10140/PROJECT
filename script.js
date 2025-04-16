// Graph data structure
class Graph {
    constructor() {
        this.nodes = new Map(); // Map of node name to {x, y} coordinates
        this.edges = new Map(); // Map of node name to array of {to, weight} objects
        this.nodeColors = new Map(); // Map of node name to color
    }

    addNode(name, x, y) {
        if (!this.nodes.has(name)) {
            this.nodes.set(name, { x, y });
            this.edges.set(name, []);
            this.nodeColors.set(name, '#3498db'); // Default blue color
            return true;
        }
        return false;
    }

    addEdge(from, to, weight) {
        if (this.nodes.has(from) && this.nodes.has(to)) {
            // Check if edge already exists
            const existingEdges = this.edges.get(from);
            const existingEdge = existingEdges.find(edge => edge.to === to);
            
            if (existingEdge) {
                existingEdge.weight = weight; // Update weight if edge exists
            } else {
                existingEdges.push({ to, weight });
            }
            
            // For undirected graph, add the reverse edge too
            const reverseEdges = this.edges.get(to);
            const reverseEdge = reverseEdges.find(edge => edge.to === from);
            
            if (reverseEdge) {
                reverseEdge.weight = weight;
            } else {
                reverseEdges.push({ to: from, weight });
            }
            
            return true;
        }
        return false;
    }

    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.nodeColors.clear();
    }

    // Dijkstra's algorithm implementation
    findShortestPath(startNode, endNode) {
        if (!this.nodes.has(startNode) || !this.nodes.has(endNode)) {
            return { path: [], distance: Infinity, visitedNodes: [] };
        }

        // Initialize distances with Infinity for all nodes except the start node
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();
        const visitedNodes = [];

        // Set all initial distances to Infinity
        for (const node of this.nodes.keys()) {
            distances.set(node, Infinity);
            previous.set(node, null);
            unvisited.add(node);
        }

        // Set distance of start node to 0
        distances.set(startNode, 0);

        // Main algorithm loop
        while (unvisited.size > 0) {
            // Find the unvisited node with the smallest distance
            let current = null;
            let smallestDistance = Infinity;

            for (const node of unvisited) {
                const distance = distances.get(node);
                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    current = node;
                }
            }

            // If the smallest distance is Infinity, there's no path
            if (smallestDistance === Infinity) break;

            // If we've reached the end node, we're done
            if (current === endNode) {
                visitedNodes.push(current);
                break;
            }

            // Remove current node from unvisited set
            unvisited.delete(current);
            visitedNodes.push(current);

            // Check all neighbors of the current node
            for (const { to, weight } of this.edges.get(current)) {
                if (unvisited.has(to)) {
                    // Calculate new distance
                    const newDistance = distances.get(current) + weight;
                    
                    // If new distance is smaller, update it
                    if (newDistance < distances.get(to)) {
                        distances.set(to, newDistance);
                        previous.set(to, current);
                    }
                }
            }
        }

        // Build the path by backtracking from end to start
        const path = [];
        let current = endNode;

        // If there's no path to the end node
        if (previous.get(endNode) === null && startNode !== endNode) {
            return { path: [], distance: Infinity, visitedNodes };
        }

        // Reconstruct the path
        while (current !== null) {
            path.unshift(current);
            current = previous.get(current);
        }

        return {
            path,
            distance: distances.get(endNode),
            visitedNodes
        };
    }
}

// UI Controller
document.addEventListener('DOMContentLoaded', function() {
    const graph = new Graph();
    
    // Get DOM elements
    const canvas = document.getElementById('graph-canvas');
    const ctx = canvas.getContext('2d');
    const canvasMessage = document.getElementById('canvas-message');
    
    // Node input elements
    const nodeNameInput = document.getElementById('node-name');
    const addNodeButton = document.getElementById('add-node');
    
    // Edge input elements
    const fromNodeSelect = document.getElementById('from-node');
    const toNodeSelect = document.getElementById('to-node');
    const edgeWeightInput = document.getElementById('edge-weight');
    const addEdgeButton = document.getElementById('add-edge');
    
    // Path finding elements
    const startNodeSelect = document.getElementById('start-node');
    const endNodeSelect = document.getElementById('end-node');
    const findPathButton = document.getElementById('find-path');
    const pathDisplay = document.getElementById('path-display');
    const distanceDisplay = document.getElementById('distance-display');
    
    // Action buttons
    const clearGraphButton = document.getElementById('clear-graph');
    const exampleGraphButton = document.getElementById('example-graph');
    
    // Canvas properties
    const nodeRadius = 20;
    let isDragging = false;
    let draggedNode = null;
    let isPlacingNode = false;
    
    // Animation properties
    let visitedNodesAnimation = [];
    let pathAnimation = [];
    let animationStep = 0;
    let animationInterval = null;
    
    // Make canvas responsive
    function resizeCanvas() {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        canvas.width = rect.width;
        canvas.height = 400; // Fixed height or you can make it responsive too
        
        drawGraph();
    }
    
    // Initial sizing and resize listener
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Function to update the node selectors
    function updateNodeSelectors() {
        // Clear existing options
        fromNodeSelect.innerHTML = '';
        toNodeSelect.innerHTML = '';
        startNodeSelect.innerHTML = '';
        endNodeSelect.innerHTML = '';
        
        // Add options for each node
        for (const nodeName of graph.nodes.keys()) {
            const fromOption = document.createElement('option');
            fromOption.value = nodeName;
            fromOption.textContent = nodeName;
            fromNodeSelect.appendChild(fromOption);
            
            const toOption = document.createElement('option');
            toOption.value = nodeName;
            toOption.textContent = nodeName;
            toNodeSelect.appendChild(toOption);
            
            const startOption = document.createElement('option');
            startOption.value = nodeName;
            startOption.textContent = nodeName;
            startNodeSelect.appendChild(startOption);
            
            const endOption = document.createElement('option');
            endOption.value = nodeName;
            endOption.textContent = nodeName;
            endNodeSelect.appendChild(endOption);
        }
    }
    
    // Function to draw the graph
    function drawGraph(highlightPath = [], visitedNodes = []) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw edges
        for (const [fromNode, edges] of graph.edges.entries()) {
            const fromPos = graph.nodes.get(fromNode);
            
            for (const edge of edges) {
                const toPos = graph.nodes.get(edge.to);
                
                // Check if this edge is part of the highlighted path
                const isHighlighted = 
                    highlightPath.length > 1 && 
                    highlightPath.includes(fromNode) && 
                    highlightPath.includes(edge.to) &&
                    (highlightPath.indexOf(fromNode) === highlightPath.indexOf(edge.to) - 1 || 
                     highlightPath.indexOf(fromNode) === highlightPath.indexOf(edge.to) + 1);
                
                // Draw the edge
                ctx.beginPath();
                ctx.moveTo(fromPos.x, fromPos.y);
                ctx.lineTo(toPos.x, toPos.y);
                
                if (isHighlighted) {
                    ctx.strokeStyle = '#e74c3c'; // Red for highlighted path
                    ctx.lineWidth = 3;
                } else {
                    ctx.strokeStyle = '#95a5a6'; // Gray for normal edges
                    ctx.lineWidth = 2;
                }
                
                ctx.stroke();
                
                // Draw the weight
                const midX = (fromPos.x + toPos.x) / 2;
                const midY = (fromPos.y + toPos.y) / 2;
                
                ctx.fillStyle = isHighlighted ? '#e74c3c' : '#34495e';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Add a white background to the weight text
                const weightText = edge.weight.toString();
                const textWidth = ctx.measureText(weightText).width;
                ctx.fillStyle = 'white';
                ctx.fillRect(midX - textWidth/2 - 3, midY - 10, textWidth + 6, 20);
                
                ctx.fillStyle = isHighlighted ? '#e74c3c' : '#34495e';
                ctx.fillText(weightText, midX, midY);
            }
        }
        
        // Draw nodes
        for (const [nodeName, pos] of graph.nodes.entries()) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
            
            // Determine node color
            if (highlightPath.includes(nodeName)) {
                ctx.fillStyle = '#e74c3c'; // Red for highlighted path
            } else if (visitedNodes.includes(nodeName)) {
                ctx.fillStyle = '#f39c12'; // Orange for visited nodes
            } else {
                ctx.fillStyle = graph.nodeColors.get(nodeName);
            }
            
            ctx.fill();
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw the node name
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(nodeName, pos.x, pos.y);
        }
    }
    
    // Toggle node placement mode
    addNodeButton.addEventListener('click', function() {
        const nodeName = nodeNameInput.value.trim();
        
        if (nodeName) {
            isPlacingNode = true;
            canvasMessage.style.display = 'block';
            canvasMessage.textContent = 'Click on the canvas to place the node';
            canvas.style.cursor = 'crosshair';
        } else {
            alert('Please enter a node name!');
        }
    });
    
    // Canvas click event for placing nodes
    canvas.addEventListener('click', function(e) {
        if (isPlacingNode) {
            const nodeName = nodeNameInput.value.trim();
            
            if (nodeName) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                if (graph.addNode(nodeName, x, y)) {
                    nodeNameInput.value = '';
                    updateNodeSelectors();
                    drawGraph();
                    
                    // Exit placement mode
                    isPlacingNode = false;
                    canvasMessage.style.display = 'none';
                    canvas.style.cursor = 'default';
                } else {
                    alert('Node already exists!');
                }
            }
        }
    });
    
    // Touch event for mobile node placement
    canvas.addEventListener('touchstart', function(e) {
        if (isPlacingNode) {
            e.preventDefault(); // Prevent scrolling
            
            const nodeName = nodeNameInput.value.trim();
            
            if (nodeName) {
                const rect = canvas.getBoundingClientRect();
                const touch = e.touches[0];
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                if (graph.addNode(nodeName, x, y)) {
                    nodeNameInput.value = '';
                    updateNodeSelectors();
                    drawGraph();
                    
                    // Exit placement mode
                    isPlacingNode = false;
                    canvasMessage.style.display = 'none';
                } else {
                    alert('Node already exists!');
                }
            }
        }
    });
    
    // Add a new edge
    addEdgeButton.addEventListener('click', function() {
        const fromNode = fromNodeSelect.value;
        const toNode = toNodeSelect.value;
        const weight = parseInt(edgeWeightInput.value);
        
        if (fromNode && toNode && !isNaN(weight) && weight > 0) {
            if (fromNode === toNode) {
                alert('Cannot add an edge to the same node!');
                return;
            }
            
            if (graph.addEdge(fromNode, toNode, weight)) {
                edgeWeightInput.value = '';
                drawGraph();
            }
        } else {
            alert('Please select nodes and enter a valid weight (positive number)!');
        }
    });
    
    // Find the shortest path
    findPathButton.addEventListener('click', function() {
        const startNode = startNodeSelect.value;
        const endNode = endNodeSelect.value;
        
        if (startNode && endNode) {
            // Stop any ongoing animation
            if (animationInterval) {
                clearInterval(animationInterval);
                animationInterval = null;
            }
            
            const result = graph.findShortestPath(startNode, endNode);
            
            if (result.path.length > 0) {
                // Set up animation
                visitedNodesAnimation = [...result.visitedNodes];
                pathAnimation = [...result.path];
                animationStep = 0;
                
                // Start animation
                animationInterval = setInterval(function() {
                    if (animationStep < visitedNodesAnimation.length + pathAnimation.length) {
                        animationStep++;
                        
                        // Determine which nodes to highlight
                        const currentVisited = visitedNodesAnimation.slice(0, 
                            Math.min(animationStep, visitedNodesAnimation.length));
                        
                        const currentPath = animationStep > visitedNodesAnimation.length ? 
                            pathAnimation.slice(0, animationStep - visitedNodesAnimation.length) : [];
                        
                        drawGraph(currentPath, currentVisited);
                        
                        // Update display when animation is complete
                        if (animationStep === visitedNodesAnimation.length + pathAnimation.length) {
                            pathDisplay.innerHTML = `<p>Path: ${result.path.join(' → ')}</p>`;
                            distanceDisplay.textContent = `Total Distance: ${result.distance}`;
                            
                            clearInterval(animationInterval);
                            animationInterval = null;
                        }
                    }
                }, 200); // Animation speed
            } else {
                pathDisplay.innerHTML = '<p>No path found between these nodes!</p>';
                distanceDisplay.textContent = '';
                drawGraph();
            }
        } else {
            alert('Please select start and end nodes!');
        }
    });
    
    // Canvas mouse events for dragging nodes
    canvas.addEventListener('mousedown', function(e) {
        if (isPlacingNode) return; // Don't start dragging in placement mode
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Check if a node was clicked
        for (const [nodeName, pos] of graph.nodes.entries()) {
            const distance = Math.sqrt(Math.pow(mouseX - pos.x, 2) + Math.pow(mouseY - pos.y, 2));
            
            if (distance <= nodeRadius) {
                isDragging = true;
                draggedNode = nodeName;
                break;
            }
        }
    });
    
    canvas.addEventListener('mousemove', function(e) {
        if (isDragging && draggedNode) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Update node position
            const nodePos = graph.nodes.get(draggedNode);
            nodePos.x = mouseX;
            nodePos.y = mouseY;
            
            drawGraph();
        }
    });
    
    canvas.addEventListener('mouseup', function() {
        isDragging = false;
        draggedNode = null;
    });
    
    // Touch events for mobile dragging
    canvas.addEventListener('touchstart', function(e) {
        if (isPlacingNode) return;
        
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        // Check if a node was touched
        for (const [nodeName, pos] of graph.nodes.entries()) {
            const distance = Math.sqrt(Math.pow(touchX - pos.x, 2) + Math.pow(touchY - pos.y, 2));
            
            if (distance <= nodeRadius) {
                e.preventDefault(); // Prevent scrolling when dragging
                isDragging = true;
                draggedNode = nodeName;
                break;
            }
        }
    });
    
    canvas.addEventListener('touchmove', function(e) {
        if (isDragging && draggedNode) {
            e.preventDefault(); // Prevent scrolling when dragging
            
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            
            // Update node position
            const nodePos = graph.nodes.get(draggedNode);
            nodePos.x = touchX;
            nodePos.y = touchY;
            
            drawGraph();
        }
    });
    
    canvas.addEventListener('touchend', function() {
        isDragging = false;
        draggedNode = null;
    });
    
    // Clear the graph
    clearGraphButton.addEventListener('click', function() {
        // Stop any ongoing animation
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
        
        graph.clear();
        updateNodeSelectors();
        pathDisplay.innerHTML = '<p>Select start and end nodes to find the shortest path.</p>';
        distanceDisplay.textContent = '';
        drawGraph();
    });
    
    // Load an example graph
    exampleGraphButton.addEventListener('click', function() {
        // Stop any ongoing animation
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
        
        graph.clear();
        
        // Calculate positions based on canvas size
        const width = canvas.width;
        const height = canvas.height;
        
        // Add nodes
        graph.addNode('A', width * 0.2, height * 0.25);
        graph.addNode('B', width * 0.4, height * 0.15);
        graph.addNode('C', width * 0.6, height * 0.25);
        graph.addNode('D', width * 0.2, height * 0.6);
        graph.addNode('E', width * 0.4, height * 0.75);
        graph.addNode('F', width * 0.6, height * 0.6);
        
        // Add edges
        graph.addEdge('A', 'B', 4);
        graph.addEdge('A', 'D', 2);
        graph.addEdge('B', 'C', 3);
        graph.addEdge('B', 'E', 3);
        graph.addEdge('C', 'F', 2);
        graph.addEdge('D', 'E', 1);
        graph.addEdge('E', 'F', 5);
        
        updateNodeSelectors();
        drawGraph();
    });
    
    // Initial draw
    drawGraph();
});
