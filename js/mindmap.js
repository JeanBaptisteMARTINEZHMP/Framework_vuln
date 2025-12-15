
const dist = -500

// D3.js variables
let svg, g, zoom;
let transform = d3.zoomIdentity;
let selectedNode = null;
var mindMapData = null;

// DOM Elements
const mindmap = document.getElementById('mindmap');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const resetViewBtn = document.getElementById('resetViewBtn');
const nodeModal = document.getElementById('nodeModal');
const closeModal = document.getElementById('closeModal');
const nodeName = document.getElementById('nodeName');
const nodeWeight = document.getElementById('nodeWeight');
const nodeEnabled = document.getElementById('nodeEnabled');
const toggleStatus = document.getElementById('toggleStatus');
const saveNodeBtn = document.getElementById('saveNodeBtn');
const nodeToggleGroup = document.getElementById('nodeToggleGroup');
const currentScore = document.getElementById('currentScore');
const maxScore = document.getElementById('maxScore');

// Initialize the app
function initApp() {
    // Initialize D3 mind map
    initializeMindMap();
    
    // Add event listeners
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    resetViewBtn.addEventListener('click', resetView);
    closeModal.addEventListener('click', () => nodeModal.style.display = 'none');
    saveNodeBtn.addEventListener('click', saveNodeChanges);
    nodeEnabled.addEventListener('change', updateToggleStatus);
    
    // Build the mind map from JSON data
    buildMindMap();
    
    // Update score display
    updateScoreDisplay();

    // Reset view to center
    setTimeout(() => resetView(), 100);
}

// Initialize D3 mind map
function initializeMindMap() {
    // Set up SVG
    const width = mindmap.clientWidth;
    const height = mindmap.clientHeight;
    
    svg = d3.select("#mindmap")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
        
    // Add group for zoomable content
    g = svg.append("g")
        .attr("transform", `translate(${width/2}, ${height/2})`);
    
    // Set up zoom behavior
    zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
            transform = event.transform;
        });
        
    svg.call(zoom);
}

// Build the mind map from JSON data
function buildMindMap() {
    // Convert the JSON data to a hierarchical structure for D3
    const root = d3.hierarchy(mindMapData);
    
    // Create a tree layout with radial arrangement and increased spacing
    const treeLayout = d3.tree()
        .size([2 * Math.PI, Math.min(mindmap.clientWidth, mindmap.clientHeight) / 2 - dist])
        .separation((a, b) => (a.parent == b.parent ? 2 : 3) / a.depth);
    
    // Calculate the node positions
    treeLayout(root);
    
    // Clear existing elements
    g.selectAll(".link").remove();
    g.selectAll(".node-group").remove();
    
    // Draw links
    const links = root.links();
    const link = g.selectAll(".link")
        .data(links)
        .enter().append("path")
        .attr("class", d => isNodeEnabled(d.target.data) ? "link" : "link link-disabled")
        .attr("d", d3.linkRadial()
            .angle(d => d.x)
            .radius(d => d.y));
    
    // Draw nodes
    const nodes = root.descendants();
    const nodeGroup = g.selectAll(".node-group")
        .data(nodes)
        .enter().append("g")
        .attr("class", "node-group")
        .attr("transform", d => `translate(${radialPoint(d.x, d.y)})`)
        .on("contextmenu", (event, d) => {
            event.preventDefault();
            showNodeModal(d);
        })
        .on("click", (event, d) => {
            event.stopPropagation();
            if (d.data.type === "leaf") {
                handleLeafClick(d);
            }
        });
    
    // Add circles to nodes
    nodeGroup.append("circle")
        .attr("class", "node-circle")
        .attr("r", d => getNodeRadius(d))
        .attr("fill", d => getNodeColor(d));
    
    // Add node labels
    nodeGroup.append("text")
        .attr("class", "node-label")
        .attr("dy", d => -getNodeRadius(d) - 10)
        .text(d => d.data.name);
    
    // Add node values/details inside the node
    nodeGroup.append("text")
        .attr("class", "node-value")
        .attr("dy", 4)
        .text(d => getNodeValue(d));
    
    // Add node operator/type
    nodeGroup.append("text")
        .attr("class", "node-details")
        .attr("dy", d => getNodeRadius(d) + 15)
        .text(d => getNodeDetails(d));
}

// Check if a node is enabled (including parent status)
function isNodeEnabled(nodeData) {
    if (nodeData.type === "leaf") {
        // Leaves are enabled if their parent is enabled
        return true; // Leaves are always enabled for selection when parent is enabled
    }
    return nodeData.enabled;
}

// Convert radial coordinates to Cartesian
function radialPoint(x, y) {
    return [y * Math.cos(x - Math.PI / 2), y * Math.sin(x - Math.PI / 2)];
}

// Get node radius based on depth and type
function getNodeRadius(d) {
    if (d.depth === 0) return 40; // Root node
    if (d.data.type === "leaf") return 30; // Leaf nodes
    return 35; // Other nodes
}

// Get node color based on enabled and selected status
function getNodeColor(d) {
    if (d.data.type === "leaf") {
        if (d.data.selected) {
            return "var(--node-selected)";
        }
        // Leaves are only selectable if their parent is enabled
        return isNodeEnabled(d.parent.data) ? "var(--node-color)" : "var(--node-disabled)";
    }
    return d.data.enabled ? "var(--node-color)" : "var(--node-disabled)";
}

// Get node value text in "current/max" format
function getNodeValue(d) {
    if (d.data.type === "leaf") {
        return d.data.weight;
    } else {
        const currentScore = calculateNodeScore(d.data);
        return `${currentScore}/${d.data.max_score}`;
    }
}

// Get node details text (only show operator for nodes with direct leaf children)
function getNodeDetails(d) {
    if (d.data.type === "leaf") {
        return ""; // No details for leaves
    }
    
    // Only show operator if the node has direct children that are leaves
    const hasLeafChildren = d.children && d.children.some(child => child.data.type === "leaf");
    if (hasLeafChildren && d.data.operator) {
        return d.data.operator.toUpperCase();
    }
    return "";
}

// Handle leaf click for selection
function handleLeafClick(leafNode) {
    // Only allow selection if the parent node is enabled
    if (!isNodeEnabled(leafNode.parent.data)) return;
    
    const parent = leafNode.parent;
    
    if (parent.data.operator === "and") {
        // Toggle selection for AND operator
        leafNode.data.selected = !leafNode.data.selected;
    } else if (parent.data.operator === "or") {
        // For OR operator, only one leaf can be selected
        parent.children.forEach(child => {
            if (child.data.type === "leaf") {
                child.data.selected = (child === leafNode);
            }
        });
    }
    
    // Rebuild the mind map to reflect changes
    buildMindMap();
    
    // Update the score display
    updateScoreDisplay();
}

// Show modal for editing node
function showNodeModal(d) {
    selectedNode = d;
    nodeName.value = d.data.name;
    
    if (d.data.type === "leaf") {
        // For leaves, only show weight and hide enable/disable toggle
        nodeWeight.value = d.data.weight;
        nodeWeight.disabled = false;
        nodeToggleGroup.style.display = "none";
    } else {
        nodeWeight.value = d.data.max_score;
        nodeWeight.disabled = false;
        nodeToggleGroup.style.display = "flex";
        nodeEnabled.checked = d.data.enabled;
        updateToggleStatus();
    }
    
    nodeModal.style.display = "flex";
}

// Update toggle status text
function updateToggleStatus() {
    toggleStatus.textContent = nodeEnabled.checked ? "Enabled" : "Disabled";
}

// Save node changes
function saveNodeChanges() {
    if (selectedNode) {
        if (selectedNode.data.type === "leaf") {
            selectedNode.data.weight = parseInt(nodeWeight.value);
        } else {
            selectedNode.data.max_score = parseInt(nodeWeight.value);
            
            // When enabling a node, enable all its children nodes but not leaves
            if (nodeEnabled.checked) {
                enableNodeAndChildren(selectedNode);
            } else {
                // When disabling a node, disable all its children
                disableNodeAndChildren(selectedNode);
            }
        }
        
        // Rebuild the mind map to reflect changes
        buildMindMap();
        
        // Update the score display
        updateScoreDisplay();
        
        // Close the modal
        nodeModal.style.display = "none";
    }
}

// Recursively enable a node and all its children nodes (but not leaves)
function enableNodeAndChildren(node) {
    node.data.enabled = true;
    if (node.children) {
        node.children.forEach(child => {
            if (child.data.type !== "leaf") {
                enableNodeAndChildren(child);
            }
        });
    }
}

// Recursively disable a node and all its children
function disableNodeAndChildren(node) {
    node.data.enabled = false;
    // Deselect any selected leaves when disabling
    if (node.children) {
        node.children.forEach(child => {
            if (child.data.type === "leaf") {
                child.data.selected = false;
            } else {
                disableNodeAndChildren(child);
            }
        });
    }
}

// Calculate and update the score display
function updateScoreDisplay() {
    // Calculate the current score and effective max score
    const currentScoreValue = calculateScore(mindMapData);
    const effectiveMaxScore = calculateEffectiveMaxScore(mindMapData);
    
    // Normalize the score to 100 based on effective max score
    const normalizedScore = effectiveMaxScore > 0 ? (currentScoreValue / effectiveMaxScore) * 100 : 0;
    
    currentScore.textContent = normalizedScore.toFixed(2);
    maxScore.textContent = "100";
}

// Calculate the score for a specific node
function calculateNodeScore(node) {
    if (node.type === "leaf") {
        return node.selected ? node.weight : 0;
    }
    
    let score = 0;
    if (node.children && node.children.length > 0 && node.enabled) {
        if (node.operator === "or") {
            // For OR operator, take the maximum value of selected children
            score = Math.max(...node.children.map(child => calculateNodeScore(child)));
        } else if (node.operator === "and") {
            // For AND operator, sum the values of selected children
            score = node.children.reduce((sum, child) => sum + calculateNodeScore(child), 0);
        }
    }
    
    return Math.min(score, node.max_score || 0);
}

// Calculate the effective max score (excluding disabled nodes)
function calculateEffectiveMaxScore(node) {
    // Return the theoretical maximum this node can contribute, respecting node.max_score caps
    if (!node || !node.enabled) return 0;

    if (node.type === "leaf") {
        return node.weight || 0;
    }

    // If the node has direct leaf children, the node's max_score is the cap for that subtree
    const hasLeafChildren = node.children && node.children.some(child => child.type === "leaf");
    if (hasLeafChildren) {
        // The node.max_score already represents the maximum this node can output
        return node.max_score || 0;
    }

    // Otherwise, sum the effective max of child nodes
    if (node.children && node.children.length > 0) {
        return node.children.reduce((sum, child) => sum + calculateEffectiveMaxScore(child), 0);
    }

    // Fallback: use node.max_score if present
    return node.max_score || 0;
}

// Recursively calculate the score based on selected leaves
function calculateScore(node) {
    return calculateNodeScore(node);
}

// Zoom functions
function zoomIn() {
    svg.transition().duration(300).call(zoom.scaleBy, 1.5);
}

function zoomOut() {
    svg.transition().duration(300).call(zoom.scaleBy, 0.75);
}

function resetView() {
    svg.transition().duration(300).call(
        zoom.transform,
        d3.zoomIdentity.translate(mindmap.clientWidth/2, mindmap.clientHeight/2).scale(1)
    );
}

// Load mind map data from external JSON and initialize the app
document.addEventListener('DOMContentLoaded', () => {
    fetch('js/mindmap_data.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            mindMapData = data;
            initApp();
        })
        .catch(err => {
            console.error('Failed to load mind map JSON:', err);
            // Fallback: initialize with an empty structure to avoid crashes
            mindMapData = { name: 'Root', type: 'node', operator: 'and', max_score: 100, enabled: true, children: [] };
            initApp();
        });
});