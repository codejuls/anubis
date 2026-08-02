class ScenarioForgeStudio extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.currentScenario = null;
    }

    connectedCallback() {
        this.render();
        this.loadBlueprints();
        this.setupListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: rgba(255, 255, 255, 0.82);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(16, 185, 129, 0.22);
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 8px 32px 0 rgba(16, 185, 129, 0.05);
                }

                h2 {
                    margin-top: 0;
                    color: #059669; /* Deep Emerald */
                    font-size: 20px;
                    border-bottom: 2px solid rgba(16, 185, 129, 0.1);
                    padding-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 800;
                }

                h2 span {
                    color: #10b981;
                }

                .forge-grid {
                    display: grid;
                    grid-template-columns: 1fr 1.2fr;
                    gap: 24px;
                    margin-top: 15px;
                }

                @media (max-width: 900px) {
                    .forge-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .controls-panel {
                    background: rgba(247, 249, 246, 0.85);
                    border: 1px solid rgba(16, 185, 129, 0.15);
                    border-radius: 10px;
                    padding: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                label {
                    font-size: 13px;
                    font-weight: 700;
                    color: #0f291e;
                }

                select, input[type="text"], input[type="number"] {
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 6px;
                    padding: 9px 12px;
                    font-size: 13.5px;
                    color: #0f291e;
                    font-family: inherit;
                }

                select:focus, input:focus {
                    outline: none;
                    border-color: #059669;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }

                .range-row {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }

                .toggle-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(255, 255, 255, 0.7);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    padding: 10px 12px;
                    border-radius: 6px;
                }

                .toggle-row input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    accent-color: #10b981;
                    cursor: pointer;
                }

                .btn-forge {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    padding: 12px;
                    font-size: 14.5px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .btn-forge:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.4);
                }

                /* Output Preview Panel */
                .preview-panel {
                    background: #ffffff;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    border-radius: 10px;
                    padding: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.03);
                }

                .tab-bar {
                    display: flex;
                    gap: 8px;
                    border-bottom: 1px solid rgba(16, 185, 129, 0.15);
                    padding-bottom: 8px;
                }

                .tab-btn {
                    background: transparent;
                    border: none;
                    font-size: 13px;
                    font-weight: 700;
                    color: #475569;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                }

                .tab-btn.active {
                    background: rgba(209, 250, 229, 0.8);
                    color: #047857;
                }

                .preview-body {
                    font-family: "Courier New", Courier, monospace;
                    font-size: 13.5px;
                    line-height: 1.6;
                    color: #0f291e;
                    background: rgba(247, 249, 246, 0.9);
                    border: 1px solid rgba(16, 185, 129, 0.12);
                    border-radius: 8px;
                    padding: 15px;
                    white-space: pre-line;
                    max-height: 400px;
                    overflow-y: auto;
                }

                .empty-preview {
                    color: #64748b;
                    font-style: italic;
                    text-align: center;
                    padding: 60px 10px;
                }
            </style>

            <h2><span>🔥</span> Scenario Forge Studio (Educator Controls)</h2>

            <div class="forge-grid">
                <!-- Left: Educator Controls -->
                <div class="controls-panel">
                    <div class="form-group">
                        <label for="blueprint-select">Parent Scenario Blueprint</label>
                        <select id="blueprint-select">
                            <option value="">Loading blueprints...</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Demographic Age Sampling Range</label>
                        <div class="range-row">
                            <input type="number" id="age-min" value="50" min="18" max="100" style="width: 50%;">
                            <span>to</span>
                            <input type="number" id="age-max" value="85" min="18" max="100" style="width: 50%;">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="noise-density">Isomorphic Noise Density</label>
                        <select id="noise-density">
                            <option value="Low">Low (Clean Academic Baseline)</option>
                            <option value="Medium" selected>Medium (Standard Clinical Noise)</option>
                            <option value="High">High (High-Acuity / Distractor Heavy)</option>
                        </select>
                    </div>

                    <div class="toggle-row">
                        <input type="checkbox" id="poa-mutation">
                        <label for="poa-mutation" style="margin: 0; cursor: pointer;">
                            <strong>Mutation Vector:</strong> Shift Sepsis Onset to Post-Admission (POA Mutation)
                        </label>
                    </div>

                    <button class="btn-forge" id="forge-btn">
                        🔥 Forge Scenario & Synthesize EHR
                    </button>
                </div>

                <!-- Right: Live Output Preview -->
                <div class="preview-panel">
                    <div class="tab-bar">
                        <button class="tab-btn active" id="tab-ehr">Synthesized EHR Chart</button>
                        <button class="tab-btn" id="tab-gold">Gold Standard Claims Mapping</button>
                    </div>

                    <div class="preview-body" id="preview-text">
                        <div class="empty-preview">
                            Configure your educator parameters and click "Forge Scenario" to synthesize a live medical case...
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadBlueprints() {
        const select = this.shadowRoot.getElementById('blueprint-select');
        try {
            const res = await fetch('/api/forge/blueprints');
            if (!res.ok) return;
            const blueprints = await res.json();
            
            select.innerHTML = "";
            blueprints.forEach(bp => {
                const opt = document.createElement('option');
                opt.value = bp.blueprint_id;
                opt.innerText = `${bp.blueprint_id} - ${bp.core_concept} (${bp.domain})`;
                select.appendChild(opt);
            });
        } catch (err) {
            console.error("Failed to load blueprints:", err);
        }
    }

    setupListeners() {
        const forgeBtn = this.shadowRoot.getElementById('forge-btn');
        const tabEhr = this.shadowRoot.getElementById('tab-ehr');
        const tabGold = this.shadowRoot.getElementById('tab-gold');
        const previewText = this.shadowRoot.getElementById('preview-text');

        let activeTab = "ehr";

        tabEhr.addEventListener('click', () => {
            activeTab = "ehr";
            tabEhr.classList.add('active');
            tabGold.classList.remove('active');
            this.updatePreviewText();
        });

        tabGold.addEventListener('click', () => {
            activeTab = "gold";
            tabGold.classList.add('active');
            tabEhr.classList.remove('active');
            this.updatePreviewText();
        });

        forgeBtn.addEventListener('click', async () => {
            const blueprintId = this.shadowRoot.getElementById('blueprint-select').value;
            const ageMin = parseInt(this.shadowRoot.getElementById('age-min').value) || 50;
            const ageMax = parseInt(this.shadowRoot.getElementById('age-max').value) || 85;
            const noiseDensity = this.shadowRoot.getElementById('noise-density').value;
            const poaMutation = this.shadowRoot.getElementById('poa-mutation').checked;

            if (!blueprintId) {
                alert("Please select a parent blueprint!");
                return;
            }

            try {
                forgeBtn.disabled = true;
                forgeBtn.innerText = "⏳ Synthesizing EHR...";

                const payload = {
                    blueprint_id: blueprintId,
                    age_range: [ageMin, ageMax],
                    noise_density: noiseDensity,
                    apply_poa_mutation: poaMutation
                };

                const res = await fetch('/api/forge/synthesize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error("Forge synthesis failed");

                const pkg = await res.json();
                this.currentScenario = pkg;
                this.updatePreviewText();

                // Dispatch event so parent portal can load it into sandbox if needed
                this.dispatchEvent(new CustomEvent('ScenarioForged', {
                    detail: pkg,
                    bubbles: true,
                    composed: true
                }));

            } catch (err) {
                console.error(err);
                alert(`Forge synthesis failed: ${err.message}`);
            } finally {
                forgeBtn.disabled = false;
                forgeBtn.innerText = "🔥 Forge Scenario & Synthesize EHR";
            }
        });
    }

    updatePreviewText() {
        const previewText = this.shadowRoot.getElementById('preview-text');
        if (!this.currentScenario) return;

        const tabEhr = this.shadowRoot.getElementById('tab-ehr');
        const isEhr = tabEhr.classList.contains('active');

        if (isEhr) {
            previewText.innerText = 
                `SCENARIO ID: ${this.currentScenario.scenario_id}\n` +
                `MUTATION STATUS: ${this.currentScenario.customization.poa_mutation_applied ? '⚠️ POA Shift Mutation Applied' : 'Standard Baseline'}\n` +
                `--------------------------------------------------\n\n` +
                this.currentScenario.synthesized_ehr.narrative;
        } else {
            previewText.innerText = JSON.stringify(this.currentScenario.gold_standard, null, 2);
        }
    }
}

customElements.define('scenario-forge-studio', ScenarioForgeStudio);
export default ScenarioForgeStudio;
