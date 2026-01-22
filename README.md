# Vulnerability Prioritization Framework

An interactive web application for visualizing and prioritizing vulnerabilities based on client context and organizational factors. This tool provides a comprehensive scoring system to calculate risk levels and establish prioritization strategies across technical, environmental, and threat intelligence dimensions.

**Authors:** Jean-Baptiste MARTINEZ & Noé PAQUIN  
**Version:** 1.0  
**Last Updated:** January 2026

---

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Scoring Algorithm](#scoring-algorithm)
- [Maintenance Guide](#maintenance-guide)

---

## Overview

The **Vulnerability Prioritization Framework** is a context-aware vulnerability assessment tool that visualizes security vulnerabilities as an interactive hierarchical mind map. It calculates priority scores across three main dimensions to help organizations focus remediation efforts on the most critical vulnerabilities relative to their operational context:

1. **Base Sensor Score** (50%) - Technical severity metrics (CVSS, EPSS)
2. **Environmental** (30%) - Asset criticality and organizational context
3. **Intelligence** (20%) - Threat landscape and exploit availability

The application uses **D3.js** for interactive visualization and provides a user-friendly interface.

---

## Getting Started

### Test online

The Framework is deployed on GitHub at https://jeanbaptistemartinezhmp.github.io/Framework_vuln/

### Test locally

1. **Clone or download the project**
   ```bash
   git clone https://github.com/JeanBaptisteMARTINEZHMP/Framework_vuln.git
   cd Framework_vuln
   ```

2. **Start a local web server**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Or Node.js with http-server
   npx http-server
   
   # Or using Python 2
   python -m SimpleHTTPServer 8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

---

## Usage

### Selecting Assessment Factors

1. **Expand nodes** by clicking on them to explore sub-categories
2. **Select leaves** by clicking on leaf nodes (circles at the end of branches)
   - For AND operators: multiple leaves can be selected (additive)
   - For OR operators: only one leaf can be selected

### Editing Node Properties

1. **Right-click on any node** to open the editing modal
2. **View node name** (read-only field showing current node)
3. **Modify weight/score** - Enter new value (0-100)
4. **Enable / Disable nodes** - Enable / Disable recursively the selected node
5. **Save Changes** - Click "Save Changes" button
6. Mind map updates automatically

### Quick Start

1. Open the application in your web browser
2. The mind map loads with the root node expanded
3. Click on nodes to expand/collapse branches
4. Click on leaf nodes to select/deselect assessment factors
5. Right-click on any node to edit its weight or enabled state
6. Watch the risk score update in real-time (top-left corner)

---

## Scoring Algorithm

1. **Leaf nodes:** Leaves have a predefined score (weight), their scores are set at 0 if they are not selected
2. **AND nodes:** `score = SUM(children scores), capped at max_score`
3. **OR nodes:** `score = MAX(children scores), capped at max_score`
4. **Special case:** "Base sensor score": `(CVSS × 5) × EPSS`. EPSS is set at 1 by default
5. **Total:** `(Base sensor score + Environmental score + Intelligence score) / max_score × 100`

---

## Maintenance Guide

**Modifying Nodes and Leaves:**
1. Edit `js/mindmap_data.json` to add/modify/remove nodes or leaves
2. Add the the required values to the new nodes or leaves
3. Maintain consistent `max_score` values and hierarchy
4. Verify total possible score doesn't exceed 100

**Adding New Features:**
1. Update `js/mindmap.js` with new event handlers
2. Add corresponding CSS classes in `css/styles.css`
3. Update HTML structure in `index.html` if needed

**Styling Updates:**
1. Modify CSS properties in `index.html`

