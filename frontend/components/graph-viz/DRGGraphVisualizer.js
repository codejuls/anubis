class DRGGraphVisualizer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.graphData = null;
        this.sigmaInstance = null;
    }

    connectedCallback() {
        this.render();
        this.loadDependencies();
    }

    loadDependencies() {
        // Load sigma.js and graphology from CDN if not already loaded
        if (typeof sigma === 'undefined' || typeof graphology === 'undefined') {
            const sigmaScript = document.createElement('script');
            sigmaScript.src = 'https://cdn.jsdelivr.net/npm/sigma@2.4.0/build/sigma.min.js';
            sigmaScript.onload = () => {
                const graphologyScript = document.createElement('script');
                graphologyScript.src = 'https://cdn.jsdelivr.net/npm/graphology@0.25.4/dist/graphology-browser.min.js';
                graphologyScript.onload = () => {
                    this.initializeGraph();
                };
                document.head.appendChild(graphologyScript);
            };
            document.head.appendChild(sigmaScript);
        } else {
            this.initializeGraph();
        }
    }

    initializeGraph() {
        // This will be called after dependencies are loaded
        // We'll fetch graph data and initialize the visualization
        if (this.graphData) {
            this.createVisualization();
        }
    }

    setGraphData(data) {
        this.graphData = data;
        if (this.sigmaInstance && typeof sigma !== 'undefined') {
            this.updateVisualization();
        } else if (typeof sigma !== 'undefined') {
            this.createVisualization();
        }
    }

    createVisualization() {
        if (!this.shadowRoot) return;

        // Create container for the visualization
        const container = document.createElement('div');
        container.id = 'graph-container';
        container.style.width = '100%';
        container.style.height = '400px';
        container.style.border = '1px solid #ccc';
        container.style.borderRadius = '4px';
        container.style.margin = '10px 0';

        this.shadowRoot.appendChild(container);

        // Create a new graphology graph
        const graph = new graphology.Graph();

        // Add nodes from the graph data
        if (this.graphData && this.graphData.nodes) {
            this.graphData.nodes.forEach(node => {
                graph.addNode(node.id, {
                    label: node.label || node.id,
                    size: Math.min(Math.max(node.weight || 10, 5), 30),
                    color: node.color || '#1976d2',
                    type: node.type || 'circle'
                });
            });
        }

        // Add edges from the graph data
        if (this.graphData && this.graphData.edges) {
            this.graphData.edges.forEach(edge => {
                if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) {
                    console.warn(`Edge references missing nodes: ${edge.source} -> ${edge.target}`);
                    return;
                }
                graph.addEdge(edge.source, edge.target, {
                    weight: edge.weight || 1,
                    color: edge.color || '#666',
                    type: edge.type || 'line'
                });
            });
        }

        // Initialize sigma instance
        try {
            this.sigmaInstance = new sigma({
                graph: graph,
                container: container,
                settings: {
                    defaultNodeColor: '#1976d2',
                    defaultEdgeColor: '#666',
                    labelThreshold: 6,
                    defaultLabelSize: 14,
                    defaultLabelColor: '#fff',
                    labelColor: 'default',
                    labelBGColor: 'inherit',
                    labelBGColorR: 'inherit',
                    labelBGColorG: 'inherit',
                    labelBGColorB: 'inherit',
                    labelBGColorA: 'inherit',
                    borderColor: 'default',
                    labelBorderColor: 'default',
                    labelBorderWidth: 'default',
                    labelBorderRadius: 'default',
                    font: 'Arial',
                    drawLabels: true,
                    drawEdges: true,
                    drawNodes: true,
                    edgeColor: 'default',
                    defaultEdgeType: 'line',
                    labelHoverBGColor: '#fff',
                    labelHoverBGColorR: 255,
                    labelHoverBGColorG: 255,
                    labelHoverBGColorB: 255,
                    labelHoverBGColorA: 1,
                    labelHoverColor: '#000',
                    labelHoverShadowBGColor: '#000',
                    labelHoverShadowBGColorR: 0,
                    labelHoverShadowBGColorG: 0,
                    labelHoverShadowBGColorB: 0,
                    labelHoverShadowBGColorA: 0.1,
                    labelHoverShadowColor: '#fff',
                    labelHoverShadowColorR: 255,
                    labelHoverShadowColorG: 255,
                    labelHoverShadowColorB: 255,
                    labelHoverShadowColorA: 1,
                    activeFontStyle: 'bold',
                    defaultHoverLabelBGColor: '#fff',
                    defaultHoverLabelBGColorR: 255,
                    defaultHoverLabelBGColorG: 255,
                    defaultHoverLabelBGColorB: 255,
                    defaultHoverLabelBGColorA: 1,
                    defaultHoverLabelColor: '#000',
                    defaultHoverLabelShadowBGColor: '#000',
                    defaultHoverLabelShadowBGColorR: 0,
                    defaultHoverLabelShadowBGColorG: 0,
                    defaultHoverLabelShadowBGColorB: 0,
                    defaultHoverLabelShadowBGColorA: 0.1,
                    defaultHoverLabelShadowColor: '#fff',
                    defaultHoverLabelShadowColorR: 255,
                    defaultHoverLabelShadowColorG: 255,
                    defaultHoverLabelShadowColorB: 255,
                    defaultHoverLabelShadowColorA: 1,
                    defaultLabelHoverBGColor: '#fff',
                    defaultLabelHoverBGColorR: 255,
                    defaultLabelHoverBGColorG: 255,
                    defaultLabelHoverBGColorB: 255,
                    defaultLabelHoverBGColorA: 1,
                    defaultLabelHoverColor: '#000',
                    labelHoverShadowBGColor: '#000',
                    labelHoverShadowBGColorR: 0,
                    labelHoverShadowBGColorG: 0,
                    labelHoverShadowBGColorB: 0,
                    labelHoverShadowBGColorA: 0.1,
                    labelHoverShadowColor: '#fff',
                    labelHoverShadowColorR: 255,
                    labelHoverShadowColorG: 255,
                    labelHoverShadowColorB: 255,
                    labelHoverShadowColorA: 1,
                    edgesPowRatio: 0.5,
                    nodesPowRatio: 0.5,
                    labelSizeRatio: 1,
                    labelSizeMin: 10,
                    labelSizeMax: 30,
                    labelSizePowRatio: 0.5,
                    labelAlignment: 'center',
                    labelHorizontalOffset: 0,
                    labelVerticalOffset: 0,
                    labelRotation: 0
                }
            });
        } catch (error) {
            console.error('Failed to initialize sigma instance:', error);
            container.innerHTML = `<div style="padding: 20px; text-align: center; color: #666;">
                Graph visualization failed to load: ${error.message}
            </div>`;
        }
    }

    updateVisualization() {
        if (!this.sigmaInstance) {
            this.createVisualization();
            return;
        }

        // Update the graph data
        const graph = this.sigmaInstance.graph;
        graph.clear();

        // Add nodes
        if (this.graphData && this.graphData.nodes) {
            this.graphData.nodes.forEach(node => {
                graph.addNode(node.id, {
                    label: node.label || node.id,
                    size: Math.min(Math.max(node.weight || 10, 5), 30),
                    color: node.color || '#1976d2',
                    type: node.type || 'circle'
                });
            });
        }

        // Add edges
        if (this.graphData && this.graphData.edges) {
            this.graphData.edges.forEach(edge => {
                if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) {
                    console.warn(`Edge references missing nodes: ${edge.source} -> ${edge.target}`);
                    return;
                }
                graph.addEdge(edge.source, edge.target, {
                    weight: edge.weight || 1,
                    color: edge.color || '#666',
                    type: edge.type || 'line'
                });
            });
        }

        // Refresh the sigma instance
        this.sigmaInstance.refresh();
    }

    render() {
        if (!this.shadowRoot) return;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: Arial, sans-serif;
                }
                .loading {
                    text-align: center;
                    padding: 20px;
                    color: var(--fg-muted, #6c757d);
                    font-style: italic;
                }
                .error {
                    text-align: center;
                    padding: 20px;
                    color: var(--danger, #c92a2a);
                }
                .controls {
                    display: flex;
                    gap: 10px;
                    margin: 10px 0;
                    flex-wrap: wrap;
                }
                .controls button {
                    padding: 8px 16px;
                    background-color: var(--primary, #006b3c);
                    color: white;
                    border: none;
                    border-radius: var(--radius-sm, 4px);
                    cursor: pointer;
                    font-size: 14px;
                }
                .controls button:hover {
                    background-color: var(--primary-hover, #00582e);
                }
                .controls button:disabled {
                    background-color: var(--bg-hover, #e9ecef);
                    cursor: not-allowed;
                }
                #info-panel {
                    background-color: var(--bg-hover, #e9ecef);
                    border-radius: var(--radius-sm, 4px);
                    padding: 10px;
                    margin: 10px 0;
                    font-size: 14px;
                    color: var(--fg-muted, #6c757d);
                }
            </style>
            <div>
                <h3>DRG Relationship Graph</h3>
                <div id="info-panel">
                    <p><strong>Instructions:</strong> Explore the relationships between medical codes, guidelines, and DRGs. 
                    Nodes represent medical concepts, and edges represent relationships.</p>
                </div>
                <div class="controls">
                    <button id="refresh-btn">Refresh Graph</button>
                    <button id="fit-view-btn">Fit to View</button>
                </div>
                <div id="graph-container"></div>
            </div>
        `;

        // Add event listeners
        const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
        const fitViewBtn = this.shadowRoot.getElementById('fit-view-btn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (this.sigmaInstance) {
                    this.sigmaInstance.refresh();
                }
            });
        }

        if (fitViewBtn) {
            fitViewBtn.addEventListener('click', () => {
                if (this.sigmaInstance) {
                    this.sigmaInstance.cameras[0].goTo({ 
                        x: 0, y: 0, 
                        angle: 0, 
                        ratio: 1 
                    });
                }
            });
        }
    }
}

// Define the custom element
customElements.define('drg-graph-visualizer', DRGGraphVisualizer);
