// distance between each node
const dist = -750

// D3.js variables
let svg, g, zoom;
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

// Initialize expanded state for progressive display
function initializeExpandedState(node, depth = 0) {
    node.id = Math.random().toString(36).substr(2, 9); // Add unique id
    node.expanded = depth < 1; // Only root expanded by default
    if (node.children) {
        node.children.forEach(child => initializeExpandedState(child, depth + 1));
    }
}

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
        });
        
    svg.call(zoom);
}

// Build the mind map from JSON data
function buildMindMap() {
    // Use the full hierarchy
    const root = d3.hierarchy(mindMapData);
    
    // Create a tree layout with radial arrangement and increased spacing
    const treeLayout = d3.tree()
        .size([2 * Math.PI, Math.min(mindmap.clientWidth, mindmap.clientHeight) / 2 - dist])
        .separation((a, b) => (a.parent == b.parent ? 2 : 3) / a.depth);
    
    // Calculate the node positions
    treeLayout(root);
    
    // Update existing elements or create new ones
    updateLinks(root);
    updateNodes(root);
}

// Check if a node is visible (all ancestors are expanded)
function isNodeVisible(node) {
    if (!node.parent) return true; // Root is always visible
    return node.parent.data.expanded && isNodeVisible(node.parent);
}

// Update links
function updateLinks(root) {
    const links = root.links();
    
    // Update existing links
    const link = g.selectAll(".link")
        .data(links, d => d.target.data.id)
        .join(
            enter => enter.append("path")
                .attr("class", "link")
                .attr("d", d3.linkRadial()
                    .angle(d => d.x)
                    .radius(d => d.y))
                .style("opacity", d => isNodeVisible(d.target) ? 1 : 0),
            update => update
                .attr("d", d3.linkRadial()
                    .angle(d => d.x)
                    .radius(d => d.y))
                .transition()
                .duration(200)
                .style("opacity", d => isNodeVisible(d.target) ? 1 : 0),
            exit => exit
                .transition()
                .duration(200)
                .style("opacity", 0)
                .remove()
        );
    
    // Update link visibility and class
    link
        .attr("class", d => isNodeOrAncestorEnabled(d.target) && isNodeVisible(d.target) ? "link" : "link link-disabled");
}

// Update nodes
function updateNodes(root) {
    const nodes = root.descendants();
    
    // Update existing nodes
    const nodeGroup = g.selectAll(".node-group")
        .data(nodes, d => d.data.id)
        .join(
            enter => {
                const group = enter.append("g")
                    .attr("class", "node-group")
                    .attr("transform", d => `translate(${radialPoint(d.x, d.y)})`)
                    .style("opacity", d => isNodeVisible(d) ? 1 : 0)
                    .on("contextmenu", (event, d) => {
                        event.preventDefault();
                        showNodeModal(d);
                    })
                    .on("click", (event, d) => {
                        event.stopPropagation();
                        if (d.data.type === "leaf") {
                            handleLeafClick(d);
                        } else {
                            // Toggle expansion for non-leaf nodes
                            toggleNodeExpansion(d);
                        }
                    });
                
                // Add circles
                group.append("circle")
                    .attr("class", "node-circle")
                    .attr("r", d => getNodeRadius(d))
                    .attr("fill", d => getNodeColor(d));
                
                // Add labels
                group.append("text")
                    .attr("class", "node-label")
                    .attr("dy", d => -getNodeRadius(d) - 10)
                    .text(d => d.data.name);
                
                // Add values
                group.append("text")
                    .attr("class", "node-value")
                    .attr("dy", 4)
                    .text(d => getNodeValue(d));
                
                // Add details
                group.append("text")
                    .attr("class", "node-details")
                    .attr("dy", d => getNodeRadius(d) + 15)
                    .text(d => getNodeDetails(d));
                
                // Add expansion indicator
                group.filter(d => d.data.children && d.data.children.length > 0)
                    .append("text")
                    .attr("class", "expansion-indicator")
                    .attr("x", d => getNodeRadius(d) + 20)
                    .attr("y", -5)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "16px")
                    .attr("fill", d => d.data.expanded ? "var(--node-disabled)" : "var(--node-color)")
                    .style("font-weight", "bold")
                    .style("pointer-events", "none")
                    .text(d => d.data.expanded ? "−" : "+");
                
                return group;
            },
            update => {
                update.transition()
                    .duration(200)
                    .style("opacity", d => isNodeVisible(d) ? 1 : 0)
                    .attr("transform", d => `translate(${radialPoint(d.x, d.y)})`);
                
                update.select(".node-circle")
                    .attr("fill", d => getNodeColor(d));
                
                update.select(".node-label")
                    .text(d => d.data.name);
                
                update.select(".node-value")
                    .text(d => getNodeValue(d));
                
                update.select(".node-details")
                    .text(d => getNodeDetails(d));
                
                update.select(".expansion-indicator")
                    .attr("fill", d => d.data.expanded ? "var(--node-disabled)" : "var(--node-color)")
                    .text(d => d.data.expanded ? "−" : "+");
                
                return update;
            },
            exit => exit
                .transition()
                .duration(200)
                .style("opacity", 0)
                .remove()
        );
}

// Check if a node is enabled (including parent status)
function isNodeEnabled(nodeData) {
    if (nodeData.type === "leaf") {
        // Leaves are enabled if their parent is enabled
        return true; // Leaves are always enabled for selection when parent is enabled
    }
    return nodeData.enabled;
}

// Check if a node or any of its ancestors is disabled
function isNodeOrAncestorEnabled(node) {
    if (!node) return true;
    if (node.data.type !== "leaf" && !node.data.enabled) return false;
    return isNodeOrAncestorEnabled(node.parent);
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
        return isNodeOrAncestorEnabled(d.parent) ? "var(--node-color)" : "var(--node-disabled)";
    }
    return isNodeOrAncestorEnabled(d) ? "var(--node-color)" : "var(--node-disabled)";
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
    // Find the original leaf node
    const originalLeaf = findNodeById(mindMapData, leafNode.data.id);
    // Find the original parent
    const originalParent = findParentById(mindMapData, originalLeaf.id);
    
    if (!originalParent) return;
    
    // Only allow selection if the parent node is enabled
    if (!isNodeEnabled(originalParent)) return;
    
    if (originalParent.operator === "and") {
        // Toggle selection for AND operator
        originalLeaf.selected = !originalLeaf.selected;
    } else if (originalParent.operator === "or") {
        // For OR operator, only one leaf can be selected
        originalParent.children.forEach(child => {
            if (child.type === "leaf") {
                child.selected = (child === originalLeaf);
            }
        });
    }
    
    // Rebuild the mind map to reflect changes
    buildMindMap();
    
    // Update the score display
    updateScoreDisplay();
}

// Toggle expansion of a node
function toggleNodeExpansion(node) {
    // Find the original node in mindMapData and toggle its expanded state
    const originalNode = findNodeById(mindMapData, node.data.id);
    if (originalNode && originalNode.children && originalNode.children.length > 0) {
        originalNode.expanded = !originalNode.expanded;
        // Rebuild the mind map to reflect changes
        buildMindMap();
    }
}

// Find a node in the data by its id
function findNodeById(root, id) {
    if (root.id === id) return root;
    
    if (root.children) {
        for (const child of root.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
    }
    
    return null;
}

// Find the parent of a node by the node's id
function findParentById(root, id, parent = null) {
    if (root.id === id) return parent;
    
    if (root.children) {
        for (const child of root.children) {
            const found = findParentById(child, id, root);
            if (found) return found;
        }
    }
    
    return null;
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
            selectedNode.data.weight = parseFloat(nodeWeight.value);
        } else {
            selectedNode.data.max_score = parseFloat(nodeWeight.value);
            
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
    
    // Special calculation for "Base sensor score"
    if (node.name === "Base sensor score" && node.children && node.children.length >= 2) {
        const cvss = node.children.find(child => child.name === "CVSS");
        const epss = node.children.find(child => child.name === "EPSS");
        if (cvss && cvss.selected) {
            const cvssScore = cvss.weight * 5;
            if (epss && epss.selected) {
                return Math.min(cvssScore * epss.weight, node.max_score || 0);
            } else {
                return Math.min(cvssScore, node.max_score || 0);
            }
        }
        return 0;
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
            // Initialize expanded state
            initializeExpandedState(mindMapData);
            initApp();
        })
        .catch(err => {
            console.error('Failed to load mind map JSON:', err);
            // Fallback: initialize with an empty structure to avoid crashes
            mindMapData = { name: 'Root', type: 'node', operator: 'and', max_score: 100, enabled: true, children: [] };
            initializeExpandedState(mindMapData);
            initApp();
        });
});