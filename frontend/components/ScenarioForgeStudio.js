class ScenarioForgeStudio extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.currentScenario = null;
        this.mode = 'forge'; // 'forge' or 'create'
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

                /* Mode Switcher */
                .mode-switcher {
                    display: flex;
                    gap: 8px;
                    background: rgba(236, 253, 245, 0.6);
                    padding: 4px;
                    border-radius: 10px;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    margin-bottom: 20px;
                }

                .mode-btn {
                    background: transparent;
                    border: none;
                    padding: 10px 18px;
                    border-radius: 8px;
                    font-size: 13.5px;
                    font-weight: 700;
                    color: var(--emerald-dark);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .mode-btn.active {
                    background: var(--emerald-primary);
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
                }

                /* Forge Grid (existing) */
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

                /* ===== BLUEPRINT CREATOR PANEL ===== */
                .creator-panel {
                    background: rgba(247, 249, 246, 0.85);
                    border: 1px solid rgba(16, 185, 129, 0.15);
                    border-radius: 10px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                    max-height: 70vh;
                    overflow-y: auto;
                }

                .creator-section {
                    border: 1px solid rgba(16, 185, 129, 0.15);
                    border-radius: 8px;
                    padding: 16px;
                    background: rgba(255, 255, 255, 0.6);
                }

                .creator-section h3 {
                    margin: 0 0 14px 0;
                    font-size: 14px;
                    font-weight: 700;
                    color: #059669;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid rgba(16, 185, 129, 0.1);
                }

                .creator-section h3 span {
                    color: #10b981;
                }

                .row {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .row .form-group {
                    flex: 1;
                    min-width: 200px;
                }

                .array-field {
                    border: 1px dashed rgba(16, 185, 129, 0.3);
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 10px;
                    background: rgba(255, 255, 255, 0.5);
                    position: relative;
                }

                .array-field-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }

                .array-field-title {
                    font-weight: 600;
                    font-size: 13px;
                    color: #0f291e;
                }

                .btn-sm {
                    padding: 4px 10px;
                    font-size: 11.5px;
                    font-weight: 600;
                    border-radius: 4px;
                    cursor: pointer;
                    border: none;
                    transition: all 0.2s;
                }

                .btn-add {
                    background: rgba(209, 250, 229, 0.8);
                    color: #047857;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }

                .btn-add:hover {
                    background: #a7f3d0;
                }

                .btn-remove {
                    background: #fee2e2;
                    color: #991b1b;
                    border: 1px solid #fca5a5;
                }

                .btn-remove:hover {
                    background: #fca5a5;
                    color: #7f1d1d;
                }

                .array-field .form-group {
                    margin-bottom: 8px;
                }

                .array-field .form-group:last-child {
                    margin-bottom: 0;
                }

                .btn-create {
                    background: linear-gradient(135deg, #059669, #047857);
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    padding: 14px;
                    font-size: 14.5px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-top: 10px;
                }

                .btn-create:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(5, 150, 105, 0.4);
                }

                .yaml-preview {
                    background: #0f291e;
                    color: #a7f3d0;
                    border-radius: 8px;
                    padding: 14px;
                    font-family: "Courier New", Courier, monospace;
                    font-size: 12px;
                    line-height: 1.5;
                    max-height: 300px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                }

                .yaml-preview .key { color: #10b981; }
                .yaml-preview .string { color: #d1fae5; }
                .yaml-preview .comment { color: #64748b; font-style: italic; }
                .yaml-preview .number { color: #fbbf24; }

                .alert {
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    display: none;
                }

                .alert-success {
                    background: #d1fae5;
                    color: #065f46;
                    border: 1px solid #10b981;
                }

                .alert-error {
                    background: #fee2e2;
                    color: #991b1b;
                    border: 1px solid #f87171;
                }
            </style>

            <h2><span>🔥</span> Scenario Forge Studio (Educator Controls)</h2>

            <!-- Mode Switcher -->
            <div class="mode-switcher">
                <button class="mode-btn active" id="mode-forge-btn" data-mode="forge">🔥 Forge Scenario</button>
                <button class="mode-btn" id="mode-create-btn" data-mode="create">✨ Create Blueprint</button>
            </div>

            <!-- MODE 1: FORGE SCENARIO (Existing) -->
            <div id="section-forge" class="forge-section">
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
            </div>

            <!-- MODE 2: BLUEPRINT CREATOR (New) -->
            <div id="section-create" class="create-section" style="display: none;">
                <div class="alert" id="create-alert"></div>

                <div class="creator-panel">
                    <!-- Section 1: Blueprint Identity -->
                    <div class="creator-section">
                        <h3><span>🏷️</span> Blueprint Identity</h3>
                        <div class="row">
                            <div class="form-group">
                                <label for="bp-id">Blueprint ID *</label>
                                <input type="text" id="bp-id" placeholder="BP-DOMAIN-CONCEPT-###" value="BP-NEW-CONDITION-001">
                            </div>
                            <div class="form-group">
                                <label for="bp-domain">Clinical Domain *</label>
                                <select id="bp-domain">
                                    <option value="Inpatient-Internal-Medicine">Inpatient - Internal Medicine</option>
                                    <option value="Inpatient-Cardiology">Inpatient - Cardiology</option>
                                    <option value="Inpatient-Neurology">Inpatient - Neurology</option>
                                    <option value="Inpatient-Pulmonology">Inpatient - Pulmonology</option>
                                    <option value="Inpatient-Orthopedics">Inpatient - Orthopedics</option>
                                    <option value="Inpatient-Surgery">Inpatient - Surgery</option>
                                    <option value="Inpatient-Oncology">Inpatient - Oncology</option>
                                    <option value="Inpatient-Nephrology">Inpatient - Nephrology</option>
                                </select>
                            </div>
                        </div>
                        <div class="row">
                            <div class="form-group">
                                <label for="bp-concept">Core Concept *</label>
                                <input type="text" id="bp-concept" placeholder="e.g., Acute pancreatitis with systemic inflammation">
                            </div>
                            <div class="form-group">
                                <label for="bp-difficulty">Difficulty Level *</label>
                                <select id="bp-difficulty">
                                    <option value="Introductory">Introductory</option>
                                    <option value="Moderate" selected>Moderate</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="Expert">Expert</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Demographics Rules -->
                    <div class="creator-section">
                        <h3><span>👥</span> Demographics Rules</h3>
                        <div class="row">
                            <div class="form-group">
                                <label>Age Range *</label>
                                <div class="range-row">
                                    <input type="number" id="bp-age-min" value="50" min="0" max="120" style="width: 45%;" placeholder="Min">
                                    <span>to</span>
                                    <input type="number" id="bp-age-max" value="85" min="0" max="120" style="width: 45%;" placeholder="Max">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Genders *</label>
                                <div style="display: flex; gap: 12px; margin-top: 6px;">
                                    <label style="font-weight: 500; cursor: pointer;"><input type="checkbox" id="bp-gender-f" checked> Female (F)</label>
                                    <label style="font-weight: 500; cursor: pointer;"><input type="checkbox" id="bp-gender-m" checked> Male (M)</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 3: Isomorphic Noise Pool -->
                    <div class="creator-section">
                        <h3><span>🎭</span> Isomorphic Noise Pool (Clinical Variability)</h3>
                        <div class="row">
                            <div class="form-group" style="flex: 1; min-width: 300px;">
                                <label>Social History Variants</label>
                                <div id="social-history-array">
                                    <div class="array-field">
                                        <div class="array-field-header">
                                            <span class="array-field-title">Variant 1</span>
                                            <button type="button" class="btn-sm btn-remove" onclick="this.closest('.array-field').remove(); updateSocialIndices()">Remove</button>
                                        </div>
                                        <div class="form-group">
                                            <textarea id="social-0" placeholder="e.g., Former smoker, quit 10 years ago. No active tobacco or alcohol use." rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(255,255,255,0.9);">Former smoker, quit 10 years ago. No active tobacco or alcohol use.</textarea>
                                        </div>
                                    </div>
                                    <div class="array-field">
                                        <div class="array-field-header">
                                            <span class="array-field-title">Variant 2</span>
                                            <button type="button" class="btn-sm btn-remove" onclick="this.closest('.array-field').remove(); updateSocialIndices()">Remove</button>
                                        </div>
                                        <div class="form-group">
                                            <textarea id="social-1" placeholder="e.g., Never smoked. Occasional social glass of wine on weekends." rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(255,255,255,0.9);">Never smoked. Occasional social glass of wine on weekends.</textarea>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" class="btn-sm btn-add" onclick="addSocialVariant()">+ Add Social History Variant</button>
                            </div>
                            <div class="form-group" style="flex: 1; min-width: 300px;">
                                <label>Chronic Condition Variants</label>
                                <div id="chronic-conditions-array">
                                    <div class="array-field">
                                        <div class="array-field-header">
                                            <span class="array-field-title">Condition 1</span>
                                            <button type="button" class="btn-sm btn-remove" onclick="this.closest('.array-field').remove(); updateChronicIndices()">Remove</button>
                                        </div>
                                        <div class="row">
                                            <div class="form-group" style="min-width: 120px;">
                                                <label>ICD-10 Code</label>
                                                <input type="text" id="chronic-code-0" value="I10" placeholder="I10">
                                            </div>
                                            <div class="form-group" style="flex: 1;">
                                                <label>Description</label>
                                                <input type="text" id="chronic-desc-0" value="Essential hypertension" placeholder="Essential hypertension">
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label>Clinical Marker (Narrative)</label>
                                            <textarea id="chronic-marker-0" placeholder="e.g., BP controlled on home Lisinopril 10mg daily." rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(255,255,255,0.9);">BP controlled on home Lisinopril 10mg daily.</textarea>
                                        </div>
                                    </div>
                                    <div class="array-field">
                                        <div class="array-field-header">
                                            <span class="array-field-title">Condition 2</span>
                                            <button type="button" class="btn-sm btn-remove" onclick="this.closest('.array-field').remove(); updateChronicIndices()">Remove</button>
                                        </div>
                                        <div class="row">
                                            <div class="form-group" style="min-width: 120px;">
                                                <label>ICD-10 Code</label>
                                                <input type="text" id="chronic-code-1" value="E11.9" placeholder="E11.9">
                                            </div>
                                            <div class="form-group" style="flex: 1;">
                                                <label>Description</label>
                                                <input type="text" id="chronic-desc-1" value="Type 2 diabetes mellitus without complications" placeholder="Type 2 diabetes mellitus without complications">
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label>Clinical Marker (Narrative)</label>
                                            <textarea id="chronic-marker-1" placeholder="e.g., HbA1c 6.8% on Metformin 500mg BID." rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(255,255,255,0.9);">HbA1c 6.8% on Metformin 500mg BID.</textarea>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" class="btn-sm btn-add" onclick="addChronicCondition()">+ Add Chronic Condition</button>
                            </div>
                        </div>
                    </div>

                    <!-- Section 4: Clinical Template -->
                    <div class="creator-section">
                        <h3><span>🏥</span> Clinical Template (Vitals & Labs)</h3>
                        <div class="form-group">
                            <label for="bp-chief-complaint">Chief Complaint *</label>
                            <input type="text" id="bp-chief-complaint" placeholder="e.g., Severe epigastric pain radiating to back, nausea, vomiting">
                        </div>

                        <div class="row">
                            <div class="form-group">
                                <label>Vital Signs Ranges</label>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                    <div class="form-group">
                                        <label>Temp (°F) Range</label>
                                        <div class="range-row">
                                            <input type="number" id="bp-temp-min" value="100.5" step="0.1" min="95" max="108" style="width: 45%;" placeholder="Min">
                                            <span>to</span>
                                            <input type="number" id="bp-temp-max" value="102.5" step="0.1" min="95" max="108" style="width: 45%;" placeholder="Max">
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Heart Rate (bpm) Range</label>
                                        <div class="range-row">
                                            <input type="number" id="bp-hr-min" value="100" min="40" max="180" style="width: 45%;" placeholder="Min">
                                            <span>to</span>
                                            <input type="number" id="bp-hr-max" value="118" min="40" max="180" style="width: 45%;" placeholder="Max">
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Resp Rate Range</label>
                                        <div class="range-row">
                                            <input type="number" id="bp-rr-min" value="20" min="8" max="40" style="width: 45%;" placeholder="Min">
                                            <span>to</span>
                                            <input type="number" id="bp-rr-max" value="26" min="8" max="40" style="width: 45%;" placeholder="Max">
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>BP Systolic Range</label>
                                        <div class="range-row">
                                            <input type="number" id="bp-sys-min" value="95" min="60" max="220" style="width: 45%;" placeholder="Min">
                                            <span>to</span>
                                            <input type="number" id="bp-sys-max" value="115" min="60" max="220" style="width: 45%;" placeholder="Max">
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>BP Diastolic Range</label>
                                        <div class="range-row">
                                            <input type="number" id="bp-dia-min" value="55" min="30" max="140" style="width: 45%;" placeholder="Min">
                                            <span>to</span>
                                            <input type="number" id="bp-dia-max" value="70" min="30" max="140" style="width: 45%;" placeholder="Max">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="form-group">
                                <label>Lab Ranges</label>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                    <div class="form-group">
                                        <label>WBC (K/uL) Range</label>
                                        <div class="range-row">
                                            <input type="number" id="bp-wbc-min" value="12.0" step="0.1" min="1" max="50" style="width: 45%;" placeholder="Min">
                                            <span>to</span>
                                            <input type="number" id="bp-wbc-max" value="18.0" step="0.1" min="1" max="50" style="width: 45%;" placeholder="Max">
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Lactate (mmol/L) Range</label>
                                        <div class="range-row">
                                            <input type="number" id="bp-lactate-min" value="1.5" step="0.1" min="0.3" max="10" style="width: 45%;" placeholder="Min">
                                            <span>to</span>
                                            <input type="number" id="bp-lactate-max" value="3.5" step="0.1" min="0.3" max="10" style="width: 45%;" placeholder="Max">
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Custom Lab 1 Name</label>
                                        <input type="text" id="bp-custom-lab1-name" placeholder="e.g., BNP (pg/mL), Troponin (ng/mL), CRP (mg/dL)">
                                    </div>
                                    <div class="form-group">
                                        <label>Custom Lab 1 Range</label>
                                        <div class="range-row">
                                            <input type="number" id="bp-custom-lab1-min" step="0.1" style="width: 45%;" placeholder="Min">
                                            <span>to</span>
                                            <input type="number" id="bp-custom-lab1-max" step="0.1" style="width: 45%;" placeholder="Max">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="bp-chest-xray">Chest X-Ray Finding *</label>
                            <textarea id="bp-chest-xray" placeholder="e.g., Left lower lobe opacity consistent with acute infiltrate/consolidation." rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(255,255,255,0.9);">Left lower lobe opacity consistent with acute infiltrate/consolidation.</textarea>
                        </div>

                        <div class="form-group">
                            <label for="bp-assessment">Assessment / Hospital Course Narrative *</label>
                            <textarea id="bp-assessment" placeholder="e.g., Severe sepsis secondary to community-acquired pneumonia. Patient was placed on sepsis resuscitation protocol..." rows="3" style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(255,255,255,0.9);">Severe sepsis secondary to community-acquired pneumonia. Patient was placed on sepsis resuscitation protocol with IV fluid boluses and started on broad-spectrum IV antibiotics (Ceftriaxone and Azithromycin). Supplemental oxygen titrated via nasal cannula. Chronic conditions were monitored and maintained on home medications.</textarea>
                        </div>
                    </div>

                    <!-- Section 5: Gold Standard Claims Mapping -->
                    <div class="creator-section">
                        <h3><span>📋</span> Gold Standard Claims Mapping</h3>

                        <div class="form-group">
                            <label>Principal Diagnosis *</label>
                            <div class="row">
                                <div class="form-group" style="min-width: 120px;">
                                    <label>ICD-10 Code</label>
                                    <input type="text" id="bp-pdx-code" value="A41.9" placeholder="A41.9">
                                </div>
                                <div class="form-group" style="flex: 1;">
                                    <label>Description</label>
                                    <input type="text" id="bp-pdx-desc" value="Sepsis, unspecified organism" placeholder="Sepsis, unspecified organism">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Rationale (Coding Guideline Citation)</label>
                                <textarea id="bp-pdx-rationale" placeholder="e.g., Sepsis is present on admission (POA) and meets criteria for principal diagnosis under ICD-10-CM Guideline I.C.1.d.1.a." rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(255,255,255,0.9);">Sepsis is present on admission (POA) and meets criteria for principal diagnosis under ICD-10-CM Guideline I.C.1.d.1.a.</textarea>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Secondary Diagnoses</label>
                            <div id="secondary-diagnoses-array">
                                <div class="array-field">
                                    <div class="array-field-header">
                                        <span class="array-field-title">Secondary 1</span>
                                        <button type="button" class="btn-sm btn-remove" onclick="this.closest('.array-field').remove(); updateSecondaryIndices()">Remove</button>
                                    </div>
                                    <div class="row">
                                        <div class="form-group" style="min-width: 100px;">
                                            <label>ICD-10 Code</label>
                                            <input type="text" id="bp-sdx-code-0" value="J18.9" placeholder="J18.9">
                                        </div>
                                        <div class="form-group" style="flex: 1;">
                                            <label>Description</label>
                                            <input type="text" id="bp-sdx-desc-0" value="Pneumonia, unspecified organism" placeholder="Pneumonia, unspecified organism">
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="form-group" style="min-width: 100px;">
                                            <label>CC/MCC Type</label>
                                            <select id="bp-sdx-type-0">
                                                <option value="None">None</option>
                                                <option value="CC">CC</option>
                                                <option value="MCC" selected>MCC</option>
                                            </select>
                                        </div>
                                        <div class="form-group" style="flex: 1;">
                                            <label>POA</label>
                                            <select id="bp-sdx-poa-0">
                                                <option value="Y" selected>Y (Present on Admission)</option>
                                                <option value="N">N (Not Present on Admission)</option>
                                                <option value="U">U (Unknown)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Rationale</label>
                                        <textarea id="bp-sdx-rationale-0" placeholder="e.g., Localized pulmonary infection causing systemic sepsis. Classified as MCC." rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(255,255,255,0.9);">Localized pulmonary infection causing systemic sepsis. Classified as MCC.</textarea>
                                    </div>
                                </div>
                                <div class="array-field">
                                    <div class="array-field-header">
                                        <span class="array-field-title">Secondary 2</span>
                                        <button type="button" class="btn-sm btn-remove" onclick="this.closest('.array-field').remove(); updateSecondaryIndices()">Remove</button>
                                    </div>
                                    <div class="row">
                                        <div class="form-group" style="min-width: 100px;">
                                            <label>ICD-10 Code</label>
                                            <input type="text" id="bp-sdx-code-1" value="J44.1" placeholder="J44.1">
                                        </div>
                                        <div class="form-group" style="flex: 1;">
                                            <label>Description</label>
                                            <input type="text" id="bp-sdx-desc-1" value="Chronic obstructive pulmonary disease with (acute) exacerbation" placeholder="COPD with acute exacerbation">
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="form-group" style="min-width: 100px;">
                                            <label>CC/MCC Type</label>
                                            <select id="bp-sdx-type-1">
                                                <option value="None">None</option>
                                                <option value="CC" selected>CC</option>
                                                <option value="MCC">MCC</option>
                                            </select>
                                        </div>
                                        <div class="form-group" style="flex: 1;">
                                            <label>POA</label>
                                            <select id="bp-sdx-poa-1">
                                                <option value="Y" selected>Y (Present on Admission)</option>
                                                <option value="N">N (Not Present on Admission)</option>
                                                <option value="U">U (Unknown)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Rationale</label>
                                        <textarea id="bp-sdx-rationale-1" placeholder="e.g., Acute exacerbation managed with bronchodilator therapy." rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(255,255,255,0.9);">Acute exacerbation managed with bronchodilator therapy.</textarea>
                                    </div>
                                </div>
                            </div>
                            <button type="button" class="btn-sm btn-add" onclick="addSecondaryDiagnosis()" style="margin-top: 8px;">+ Add Secondary Diagnosis</button>
                        </div>
                    </div>

                    <!-- Actions & YAML Preview -->
                    <div class="creator-section" style="background: rgba(236, 253, 245, 0.5);">
                        <h3><span>⚡</span> Generate & Export</h3>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                            <button class="btn-create" id="btn-preview-yaml">👁️ Preview YAML</button>
                            <button class="btn-create" id="btn-save-blueprint" style="background: linear-gradient(135deg, #10b981, #059669);">💾 Save Blueprint to Project</button>
                            <button class="btn-create" id="btn-download-yaml" style="background: linear-gradient(135deg, #047857, #065f46);">⬇️ Download .yaml File</button>
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 600; color: #047857;">YAML Preview (Editable)</label>
                            <textarea id="yaml-preview" class="yaml-preview" placeholder="Click 'Preview YAML' to generate..." spellcheck="false" style="height: 280px;"></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize array indices
        this.socialCount = 2;
        this.chronicCount = 2;
        this.secondaryCount = 2;

        // Setup dynamic array handlers
        this.setupArrayHandlers();
    }

    setupArrayHandlers() {
        // Make helper functions globally accessible for onclick
        const self = this;
        window.addSocialVariant = () => self.addSocialVariant();
        window.updateSocialIndices = () => self.updateSocialIndices();
        window.addChronicCondition = () => self.addChronicCondition();
        window.updateChronicIndices = () => self.updateChronicIndices();
        window.addSecondaryDiagnosis = () => self.addSecondaryDiagnosis();
        window.updateSecondaryIndices = () => self.updateSecondaryIndices();
    }

    addSocialVariant() {
        const container = this.shadowRoot.getElementById('social-history-array');
        const index = this.socialCount++;
        const field = document.createElement('div');
        field.className = 'array-field';
        field.innerHTML = `
            <div class="array-field-header">
                <span class="array-field-title">Variant ${index + 1}</span>
                <button type="button" class="btn-sm btn-remove" onclick="this.closest('.array-field').remove(); updateSocialIndices()">Remove</button>
            </div>
            <div class="form-group">
                <textarea id="social-${index}" placeholder="e.g., Denies history of tobacco, alcohol, or illicit drug use." rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(255,255,255,0.9);"></textarea>
            </div>
        `;
        container.appendChild(field);
        this.updateSocialIndices();
    }

    updateSocialIndices() {
        const fields = this.shadowRoot.querySelectorAll('#social-history-array .array-field');
        fields.forEach((field, i) => {
            field.querySelector('.array-field-title').textContent = `Variant ${i + 1}`;
            const textarea = field.querySelector('textarea');
            if (textarea) textarea.id = `social-${i}`;
        });
    }

    addChronicCondition() {
        const container = this.shadowRoot.getElementById('chronic-conditions-array');
        const index = this.chronicCount++;
        const field = document.createElement('div');
        field.className = 'array-field';
        field.innerHTML = `
            <div class="array-field-header">
                <span class="array-field-title">Condition ${index + 1}</span>
                <button type="button" class="btn-sm btn-remove" onclick="this.closest('.array-field').remove(); updateChronicIndices()">Remove</button>
            </div>
            <div class="row">
                <div class="form-group" style="min-width: 120px;">
                    <label>ICD-10 Code</label>
                    <input type="text" id="chronic-code-${index}" placeholder="I10">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label>Description</label>
                    <input type="text" id="chronic-desc-${index}" placeholder="Essential hypertension">
                </div>
            </div>
            <div class="form-group">
                <label>Clinical Marker (Narrative)</label>
                <textarea id="chronic-marker-${index}" placeholder="e.g., BP controlled on home Lisinopril 10mg daily." rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(255,255,255,0.9);"></textarea>
            </div>
        `;
        container.appendChild(field);
        this.updateChronicIndices();
    }

    updateChronicIndices() {
        const fields = this.shadowRoot.querySelectorAll('#chronic-conditions-array .array-field');
        fields.forEach((field, i) => {
            field.querySelector('.array-field-title').textContent = `Condition ${i + 1}`;
            const inputs = field.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                if (input.id.startsWith('chronic-code-')) input.id = `chronic-code-${i}`;
                else if (input.id.startsWith('chronic-desc-')) input.id = `chronic-desc-${i}`;
                else if (input.id.startsWith('chronic-marker-')) input.id = `chronic-marker-${i}`;
            });
        });
    }

    addSecondaryDiagnosis() {
        const container = this.shadowRoot.getElementById('secondary-diagnoses-array');
        const index = this.secondaryCount++;
        const field = document.createElement('div');
        field.className = 'array-field';
        field.innerHTML = `
            <div class="array-field-header">
                <span class="array-field-title">Secondary ${index + 1}</span>
                <button type="button" class="btn-sm btn-remove" onclick="this.closest('.array-field').remove(); updateSecondaryIndices()">Remove</button>
            </div>
            <div class="row">
                <div class="form-group" style="min-width: 100px;">
                    <label>ICD-10 Code</label>
                    <input type="text" id="bp-sdx-code-${index}" placeholder="J18.9">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label>Description</label>
                    <input type="text" id="bp-sdx-desc-${index}" placeholder="Pneumonia, unspecified organism">
                </div>
            </div>
            <div class="row">
                <div class="form-group" style="min-width: 100px;">
                    <label>CC/MCC Type</label>
                    <select id="bp-sdx-type-${index}">
                        <option value="None">None</option>
                        <option value="CC">CC</option>
                        <option value="MCC">MCC</option>
                    </select>
                </div>
                <div class="form-group" style="flex: 1;">
                    <label>POA</label>
                    <select id="bp-sdx-poa-${index}">
                        <option value="Y">Y (Present on Admission)</option>
                        <option value="N">N (Not Present on Admission)</option>
                        <option value="U">U (Unknown)</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Rationale</label>
                <textarea id="bp-sdx-rationale-${index}" placeholder="e.g., Localized infection causing systemic response." rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(255,255,255,0.9);"></textarea>
            </div>
        `;
        container.appendChild(field);
        this.updateSecondaryIndices();
    }

    updateSecondaryIndices() {
        const fields = this.shadowRoot.querySelectorAll('#secondary-diagnoses-array .array-field');
        fields.forEach((field, i) => {
            field.querySelector('.array-field-title').textContent = `Secondary ${i + 1}`;
            const inputs = field.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.id.startsWith('bp-sdx-code-')) input.id = `bp-sdx-code-${i}`;
                else if (input.id.startsWith('bp-sdx-desc-')) input.id = `bp-sdx-desc-${i}`;
                else if (input.id.startsWith('bp-sdx-type-')) input.id = `bp-sdx-type-${i}`;
                else if (input.id.startsWith('bp-sdx-poa-')) input.id = `bp-sdx-poa-${i}`;
                else if (input.id.startsWith('bp-sdx-rationale-')) input.id = `bp-sdx-rationale-${i}`;
            });
        });
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
        const modeForgeBtn = this.shadowRoot.getElementById('mode-forge-btn');
        const modeCreateBtn = this.shadowRoot.getElementById('mode-create-btn');
        const sectionForge = this.shadowRoot.getElementById('section-forge');
        const sectionCreate = this.shadowRoot.getElementById('section-create');

        const forgeBtn = this.shadowRoot.getElementById('forge-btn');
        const tabEhr = this.shadowRoot.getElementById('tab-ehr');
        const tabGold = this.shadowRoot.getElementById('tab-gold');
        const previewText = this.shadowRoot.getElementById('preview-text');

        const btnPreviewYaml = this.shadowRoot.getElementById('btn-preview-yaml');
        const btnSaveBlueprint = this.shadowRoot.getElementById('btn-save-blueprint');
        const btnDownloadYaml = this.shadowRoot.getElementById('btn-download-yaml');
        const yamlPreview = this.shadowRoot.getElementById('yaml-preview');
        const alertEl = this.shadowRoot.getElementById('create-alert');

        let activeTab = "ehr";

        // Mode switcher
        modeForgeBtn.addEventListener('click', () => {
            this.mode = 'forge';
            modeForgeBtn.classList.add('active');
            modeCreateBtn.classList.remove('active');
            sectionForge.style.display = 'block';
            sectionCreate.style.display = 'none';
        });

        modeCreateBtn.addEventListener('click', () => {
            this.mode = 'create';
            modeCreateBtn.classList.add('active');
            modeForgeBtn.classList.remove('active');
            sectionForge.style.display = 'none';
            sectionCreate.style.display = 'block';
        });

        // Forge tab switching
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

        // Forge Scenario
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

        // Blueprint Creator: Preview YAML
        btnPreviewYaml.addEventListener('click', () => {
            const yaml = this.generateYAML();
            yamlPreview.value = yaml;
            this.showAlert('YAML preview generated. Review and click Save or Download.', 'success');
        });

        // Blueprint Creator: Save to Project
        btnSaveBlueprint.addEventListener('click', async () => {
            const yaml = this.generateYAML();
            const bpId = this.shadowRoot.getElementById('bp-id').value.trim();

            if (!bpId) {
                this.showAlert('Blueprint ID is required!', 'error');
                return;
            }

            try {
                const res = await fetch('/api/forge/blueprints/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ blueprint_id: bpId, yaml_content: yaml })
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Save failed');
                }

                this.showAlert(`Blueprint "${bpId}" saved successfully! Reloading blueprint list...`, 'success');
                await this.loadBlueprints();
            } catch (err) {
                console.error(err);
                this.showAlert(`Save failed: ${err.message}`, 'error');
            }
        });

        // Blueprint Creator: Download YAML
        btnDownloadYaml.addEventListener('click', () => {
            const yaml = this.generateYAML();
            const bpId = this.shadowRoot.getElementById('bp-id').value.trim() || 'blueprint';
            const blob = new Blob([yaml], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${bpId}.yaml`;
            a.click();
            URL.revokeObjectURL(url);
            this.showAlert('YAML file downloaded!', 'success');
        });

        // Live YAML preview as user types (optional - debounced)
        let yamlDebounce = null;
        this.shadowRoot.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('input', () => {
                if (this.mode === 'create') {
                    clearTimeout(yamlDebounce);
                    yamlDebounce = setTimeout(() => {
                        const yaml = this.generateYAML();
                        yamlPreview.value = yaml;
                    }, 800);
                }
            });
        });
    }

    showAlert(message, type) {
        const alertEl = this.shadowRoot.getElementById('create-alert');
        alertEl.textContent = message;
        alertEl.className = `alert alert-${type}`;
        alertEl.style.display = 'block';
        setTimeout(() => { alertEl.style.display = 'none'; }, 5000);
    }

    generateYAML() {
        const bpId = this.shadowRoot.getElementById('bp-id').value.trim() || 'BP-NEW-001';
        const domain = this.shadowRoot.getElementById('bp-domain').value;
        const concept = this.shadowRoot.getElementById('bp-concept').value.trim() || 'New clinical concept';
        const difficulty = this.shadowRoot.getElementById('bp-difficulty').value;

        const ageMin = parseInt(this.shadowRoot.getElementById('bp-age-min').value) || 18;
        const ageMax = parseInt(this.shadowRoot.getElementById('bp-age-max').value) || 90;
        const genders = [];
        if (this.shadowRoot.getElementById('bp-gender-f').checked) genders.push('F');
        if (this.shadowRoot.getElementById('bp-gender-m').checked) genders.push('M');
        if (genders.length === 0) genders.push('F', 'M');

        // Social history
        const socialHistory = [];
        this.shadowRoot.querySelectorAll('#social-history-array textarea').forEach(ta => {
            const val = ta.value.trim();
            if (val) socialHistory.push(val);
        });
        if (socialHistory.length === 0) {
            socialHistory.push("No social history variant provided.");
        }

        // Chronic conditions
        const chronicConditions = [];
        this.shadowRoot.querySelectorAll('#chronic-conditions-array .array-field').forEach(field => {
            const code = field.querySelector('input[id^="chronic-code-"]').value.trim();
            const desc = field.querySelector('input[id^="chronic-desc-"]').value.trim();
            const marker = field.querySelector('textarea[id^="chronic-marker-"]').value.trim();
            if (code && desc) {
                chronicConditions.push({ code, description: desc, clinical_marker: marker });
            }
        });
        if (chronicConditions.length === 0) {
            chronicConditions.push({ code: "Z00.00", description: "General adult medical examination", clinical_marker: "No chronic conditions specified." });
        }

        // Clinical template
        const chiefComplaint = this.shadowRoot.getElementById('bp-chief-complaint').value.trim() || 'Chief complaint not specified.';
        const assessment = this.shadowRoot.getElementById('bp-assessment').value.trim() || 'Assessment not specified.';
        const chestXray = this.shadowRoot.getElementById('bp-chest-xray').value.trim() || 'Chest X-ray not specified.';

        const vitals = {
            temp_fahrenheit: [
                parseFloat(this.shadowRoot.getElementById('bp-temp-min').value) || 98.6,
                parseFloat(this.shadowRoot.getElementById('bp-temp-max').value) || 100.5
            ],
            heart_rate_bpm: [
                parseInt(this.shadowRoot.getElementById('bp-hr-min').value) || 60,
                parseInt(this.shadowRoot.getElementById('bp-hr-max').value) || 100
            ],
            respiratory_rate: [
                parseInt(this.shadowRoot.getElementById('bp-rr-min').value) || 12,
                parseInt(this.shadowRoot.getElementById('bp-rr-max').value) || 20
            ],
            blood_pressure_sys: [
                parseInt(this.shadowRoot.getElementById('bp-sys-min').value) || 110,
                parseInt(this.shadowRoot.getElementById('bp-sys-max').value) || 140
            ],
            blood_pressure_dia: [
                parseInt(this.shadowRoot.getElementById('bp-dia-min').value) || 70,
                parseInt(this.shadowRoot.getElementById('bp-dia-max').value) || 90
            ]
        };

        const labs = {
            wbc_k_uL: [
                parseFloat(this.shadowRoot.getElementById('bp-wbc-min').value) || 5.0,
                parseFloat(this.shadowRoot.getElementById('bp-wbc-max').value) || 11.0
            ],
            lactate_mmol_L: [
                parseFloat(this.shadowRoot.getElementById('bp-lactate-min').value) || 0.5,
                parseFloat(this.shadowRoot.getElementById('bp-lactate-max').value) || 2.0
            ],
            chest_xray: chestXray
        };

        const customLab1Name = this.shadowRoot.getElementById('bp-custom-lab1-name').value.trim();
        const customLab1Min = this.shadowRoot.getElementById('bp-custom-lab1-min').value;
        const customLab1Max = this.shadowRoot.getElementById('bp-custom-lab1-max').value;
        if (customLab1Name && customLab1Min && customLab1Max) {
            labs[customLab1Name.toLowerCase().replace(/[^a-z0-9_]/g, '_')] = [
                parseFloat(customLab1Min),
                parseFloat(customLab1Max)
            ];
        }

        // Gold Standard
        const pdxCode = this.shadowRoot.getElementById('bp-pdx-code').value.trim() || 'Z00.00';
        const pdxDesc = this.shadowRoot.getElementById('bp-pdx-desc').value.trim() || 'Principal diagnosis not specified';
        const pdxRationale = this.shadowRoot.getElementById('bp-pdx-rationale').value.trim() || 'Rationale not provided.';

        const secondaryDiagnoses = [];
        this.shadowRoot.querySelectorAll('#secondary-diagnoses-array .array-field').forEach(field => {
            const code = field.querySelector('input[id^="bp-sdx-code-"]').value.trim();
            const desc = field.querySelector('input[id^="bp-sdx-desc-"]').value.trim();
            const type = field.querySelector('select[id^="bp-sdx-type-"]').value;
            const poa = field.querySelector('select[id^="bp-sdx-poa-"]').value;
            const rationale = field.querySelector('textarea[id^="bp-sdx-rationale-"]').value.trim();
            if (code && desc) {
                secondaryDiagnoses.push({ code, description: desc, type, poa, rationale });
            }
        });
        if (secondaryDiagnoses.length === 0) {
            secondaryDiagnoses.push({ code: "Z00.00", description: "No secondary diagnoses specified", type: "None", poa: "Y", rationale: "Placeholder." });
        }

        // Build YAML object
        const yamlObj = {
            blueprint_id: bpId,
            domain: domain,
            core_concept: concept,
            difficulty_level: difficulty,
            demographics_rules: {
                age_range: [ageMin, ageMax],
                genders: genders
            },
            isomorphic_noise_pool: {
                social_history: socialHistory,
                chronic_conditions: chronicConditions
            },
            clinical_template: {
                chief_complaint: chiefComplaint,
                vitals: vitals,
                labs: labs
            },
            gold_standard: {
                principal_diagnosis: {
                    code: pdxCode,
                    description: pdxDesc,
                    rationale: pdxRationale
                },
                secondary_diagnoses: secondaryDiagnoses.map(sd => ({
                    code: sd.code,
                    description: sd.description,
                    type: sd.type,
                    rationale: sd.rationale
                }))
            }
        };

        return this.objectToYAML(yamlObj);
    }

    objectToYAML(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let yaml = '';

        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    yaml += `${spaces}${key}: []\n`;
                } else if (typeof value[0] === 'object' && value[0] !== null) {
                    yaml += `${spaces}${key}:\n`;
                    value.forEach(item => {
                        yaml += `${spaces}  - `;
                        const itemYaml = this.objectToYAML(item, indent + 2).trim();
                        if (itemYaml.includes('\n')) {
                            yaml += '\n' + itemYaml + '\n';
                        } else {
                            yaml += itemYaml + '\n';
                        }
                    });
                } else {
                    yaml += `${spaces}${key}: [${value.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]\n`;
                }
            } else if (typeof value === 'object' && value !== null) {
                yaml += `${spaces}${key}:\n`;
                yaml += this.objectToYAML(value, indent + 1);
            } else if (typeof value === 'string') {
                // Escape quotes and special chars
                const escaped = value.replace(/"/g, '\\"');
                yaml += `${spaces}${key}: "${escaped}"\n`;
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }

        return yaml;
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