class ScenarioForgeStudio extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.currentScenario = null;
        this.mode = 'forge'; // 'forge' or 'create'
        this.wizardStep = 1;
        this.socialCount = 2;
        this.chronicCount = 2;
        this.secondaryCount = 2;
    }

    connectedCallback() {
        this.render();
        this.loadBlueprints();
        this.setupArrayHandlers();
        this.setupListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Monaco", "Courier New", monospace;
                }

                /* ========== NEUMORPHIC VARIABLES (scoped) ========== */
                :host {
                    --bg-base: #e8eae9;
                    --bg-raised: #e8eae9;
                    --bg-pressed: #d4d6d5;
                    --shadow-low: 3px 3px 6px #c5c7c6, -3px -3px 6px #ffffff;
                    --shadow-med: 6px 6px 12px #c5c7c6, -6px -6px 12px #ffffff;
                    --shadow-high: 10px 10px 20px #c5c7c6, -10px -10px 20px #ffffff;
                    --shadow-inset-low: inset 3px 3px 6px #c5c7c6, inset -3px -3px 6px #ffffff;
                    --shadow-inset-med: inset 6px 6px 12px #c5c7c6, inset -6px -6px 12px #ffffff;
                    --emerald: #007f4a;
                    --emerald-light: #00a85e;
                    --emerald-dark: #005a35;
                    --emerald-glow: rgba(0, 127, 74, 0.35);
                    --emerald-glow-strong: rgba(0, 127, 74, 0.55);
                    --text-primary: #1a1d1c;
                    --text-secondary: #4a4f4d;
                    --text-muted: #6d7371;
                    --text-on-emerald: #ffffff;
                    --border-subtle: #d0d4d2;
                    --border-emerald: #007f4a;
                    --radius-sm: 4px;
                    --radius-md: 8px;
                    --radius-lg: 12px;
                    --transition-fast: 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
                    --transition-med: 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
                    --elev-2: var(--shadow-low);
                    --elev-4: var(--shadow-med);
                }

                @media (prefers-reduced-motion: reduce) {
                    *, *::before, *::after {
                        animation-duration: 0.01ms !important;
                        transition-duration: 0.01ms !important;
                    }
                }

                /* ========== BASE COMPONENT STYLES ========== */
                .forge-root {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .panel {
                    background: var(--bg-raised);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .panel--elev-2 { box-shadow: var(--elev-2); }
                .panel--elev-4 { box-shadow: var(--elev-4); }

                .panel__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    background: var(--bg-raised);
                    border-bottom: 1px solid var(--border-subtle);
                }

                .panel__title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.9375rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .panel__icon {
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, var(--emerald), var(--emerald-light));
                    border-radius: var(--radius-sm);
                    color: var(--text-on-emerald);
                    font-size: 0.875rem;
                    box-shadow: var(--shadow-low);
                }

                .panel__body {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                }

                .workspace {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    align-items: start;
                }

                @media (max-width: 1100px) {
                    .workspace { grid-template-columns: 1fr; }
                }

                /* Form elements */
                .form-group { margin-bottom: 16px; }

                .form-label {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                }

                .neo-input,
                .neo-select,
                .neo-textarea {
                    width: 100%;
                    background: var(--bg-base);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-sm);
                    padding: 10px 14px;
                    font-size: 0.875rem;
                    color: var(--text-primary);
                    font-family: inherit;
                    box-shadow: var(--shadow-inset-low);
                    transition: all var(--transition-fast);
                }

                .neo-input:focus,
                .neo-select:focus,
                .neo-textarea:focus {
                    outline: none;
                    border-color: var(--emerald);
                    box-shadow: var(--shadow-inset-low), 0 0 0 3px var(--emerald-glow);
                }

                .neo-select {
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236d7371' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    padding-right: 40px;
                }

                .neo-textarea {
                    resize: vertical;
                    min-height: 80px;
                    line-height: 1.55;
                }

                .range-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .neo-range {
                    flex: 1;
                    -webkit-appearance: none;
                    appearance: none;
                    background: var(--bg-base);
                    border-radius: var(--radius-sm);
                    height: 6px;
                    box-shadow: var(--shadow-inset-low);
                }

                .neo-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: var(--emerald);
                    cursor: pointer;
                    box-shadow: var(--shadow-low);
                    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
                }

                .neo-range::-webkit-slider-thumb:hover {
                    transform: scale(1.15);
                    box-shadow: var(--shadow-med), 0 0 0 4px var(--emerald-glow-strong);
                }

                .neo-range::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border: none;
                    border-radius: 50%;
                    background: var(--emerald);
                    cursor: pointer;
                    box-shadow: var(--shadow-low);
                }

                .range-value {
                    min-width: 44px;
                    text-align: right;
                    font-variant-numeric: tabular-nums;
                    font-size: 0.8125rem;
                    color: var(--text-secondary);
                }

                .neo-checkbox {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                }

                .neo-checkbox input {
                    position: absolute;
                    opacity: 0;
                    pointer-events: none;
                }

                .neo-checkbox__box {
                    width: 20px;
                    height: 20px;
                    border-radius: var(--radius-sm);
                    background: var(--bg-base);
                    border: 1px solid var(--border-subtle);
                    box-shadow: var(--shadow-inset-low);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all var(--transition-fast);
                    flex-shrink: 0;
                }

                .neo-checkbox input:checked + .neo-checkbox__box {
                    background: linear-gradient(135deg, var(--emerald), var(--emerald-light));
                    border-color: transparent;
                    box-shadow: var(--shadow-low), inset 0 0 0 1px rgba(255,255,255,0.2);
                }

                .neo-checkbox__box::after {
                    content: "";
                    width: 6px;
                    height: 10px;
                    border: solid var(--text-on-emerald);
                    border-width: 0 2px 2px 0;
                    transform: rotate(45deg) translateY(-1px);
                    opacity: 0;
                    transition: opacity var(--transition-fast);
                }

                .neo-checkbox input:checked + .neo-checkbox__box::after {
                    opacity: 1;
                }

                .neo-checkbox__label {
                    font-size: 0.875rem;
                    color: var(--text-primary);
                    font-weight: 500;
                }

                /* Buttons */
                .neo-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    border: none;
                    border-radius: var(--radius-sm);
                    padding: 10px 20px;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    font-family: inherit;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    white-space: nowrap;
                }

                .neo-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none !important;
                    box-shadow: var(--shadow-inset-low) !important;
                }

                .neo-btn--primary {
                    background: linear-gradient(135deg, var(--emerald), var(--emerald-light));
                    color: var(--text-on-emerald);
                    box-shadow: var(--shadow-low), inset 0 0 0 1px rgba(255,255,255,0.15);
                }

                .neo-btn--primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-med), 0 0 0 1px rgba(255,255,255,0.15), 0 0 12px var(--emerald-glow-strong);
                }

                .neo-btn--primary:active:not(:disabled) {
                    transform: translateY(1px);
                    box-shadow: var(--shadow-inset-med);
                    background: linear-gradient(135deg, var(--emerald-dark), var(--emerald));
                }

                .neo-btn--secondary {
                    background: var(--bg-raised);
                    color: var(--text-primary);
                    box-shadow: var(--shadow-low);
                    border: 1px solid var(--border-subtle);
                }

                .neo-btn--secondary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-med);
                }

                .neo-btn--secondary:active:not(:disabled) {
                    transform: translateY(1px);
                    box-shadow: var(--shadow-inset-med);
                    background: var(--bg-pressed);
                }

                .neo-btn--ghost {
                    background: transparent;
                    color: var(--text-secondary);
                    box-shadow: none;
                    padding: 8px 12px;
                }

                .neo-btn--ghost:hover:not(:disabled) {
                    color: var(--emerald);
                    background: var(--bg-base);
                    box-shadow: var(--shadow-inset-low);
                }

                .neo-btn--sm {
                    padding: 6px 12px;
                    font-size: 0.75rem;
                }

                /* Dynamic array fields */
                .array-field {
                    background: var(--bg-base);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-md);
                    padding: 16px;
                    margin-bottom: 12px;
                    box-shadow: var(--shadow-inset-low);
                    animation: arraySlideIn var(--transition-med) ease-out;
                }

                @keyframes arraySlideIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .array-field__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--border-subtle);
                }

                .array-field__title {
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }

                .array-field__remove {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 6px;
                    border-radius: var(--radius-sm);
                    transition: all var(--transition-fast);
                }

                .array-field__remove:hover {
                    color: #c0392b;
                    background: rgba(192, 57, 43, 0.1);
                }

                /* Tabs */
                .tab-bar {
                    display: flex;
                    gap: 4px;
                    background: var(--bg-base);
                    padding: 4px;
                    border-radius: var(--radius-md);
                    box-shadow: var(--shadow-inset-low);
                    margin-bottom: 16px;
                }

                .tab-btn {
                    flex: 1;
                    background: transparent;
                    border: none;
                    padding: 10px 16px;
                    border-radius: var(--radius-sm);
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-family: inherit;
                }

                .tab-btn--active {
                    background: var(--bg-raised);
                    color: var(--emerald);
                    box-shadow: var(--shadow-low);
                }

                .tab-btn:not(.tab-btn--active):hover {
                    color: var(--text-primary);
                }

                /* Preview */
                .preview-body {
                    background: var(--bg-base);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-md);
                    padding: 16px;
                    font-family: inherit;
                    font-size: 0.8125rem;
                    line-height: 1.6;
                    color: var(--text-primary);
                    white-space: pre-wrap;
                    max-height: 420px;
                    overflow-y: auto;
                    box-shadow: var(--shadow-inset-low);
                }

                .preview-body--empty {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 200px;
                    color: var(--text-muted);
                    font-style: italic;
                    text-align: center;
                }

                /* YAML Editor */
                .yaml-editor {
                    background: #1a1d1c;
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-md);
                    padding: 16px;
                    font-family: "JetBrains Mono", "Fira Code", monospace;
                    font-size: 0.75rem;
                    line-height: 1.65;
                    color: #e8eae9;
                    max-height: 340px;
                    overflow: auto;
                    box-shadow: var(--shadow-inset-med);
                    tab-size: 2;
                }

                .yaml-editor .key { color: #00a85e; }
                .yaml-editor .string { color: #7dd3a0; }
                .yaml-editor .comment { color: #6d7371; font-style: italic; }
                .yaml-editor .number { color: #f9c74f; }

                /* Alert */
                .alert {
                    display: none;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 18px;
                    border-radius: var(--radius-md);
                    font-size: 0.8125rem;
                    font-weight: 500;
                    box-shadow: var(--elev-4);
                    animation: alertSlideIn var(--transition-med) ease-out;
                }

                @keyframes alertSlideIn {
                    from { opacity: 0; transform: translateY(-12px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .alert--success {
                    background: var(--bg-raised);
                    border: 1px solid var(--emerald);
                    color: var(--emerald-dark);
                }

                .alert--error {
                    background: var(--bg-raised);
                    border: 1px solid #c0392b;
                    color: #c0392b;
                }

                /* Wizard Stepper */
                .wizard-stepper {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 24px;
                    padding: 0 4px;
                }

                .wizard-step {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    position: relative;
                }

                .wizard-step:not(:last-child)::after {
                    content: "";
                    position: absolute;
                    top: 12px;
                    left: 50%;
                    width: 100%;
                    height: 2px;
                    background: var(--border-subtle);
                    z-index: 0;
                }

                .wizard-step--completed:not(:last-child)::after,
                .wizard-step--active:not(:last-child)::after {
                    background: linear-gradient(90deg, var(--emerald), var(--emerald-light));
                }

                .wizard-step__circle {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.6875rem;
                    font-weight: 700;
                    background: var(--bg-base);
                    border: 2px solid var(--border-subtle);
                    color: var(--text-muted);
                    box-shadow: var(--shadow-inset-low);
                    z-index: 1;
                    transition: all var(--transition-med);
                }

                .wizard-step--active .wizard-step__circle {
                    background: linear-gradient(135deg, var(--emerald), var(--emerald-light));
                    border-color: transparent;
                    color: var(--text-on-emerald);
                    box-shadow: var(--shadow-low), 0 0 0 4px var(--emerald-glow);
                }

                .wizard-step--completed .wizard-step__circle {
                    background: linear-gradient(135deg, var(--emerald), var(--emerald-light));
                    border-color: transparent;
                    color: var(--text-on-emerald);
                }

                .wizard-step__label {
                    font-size: 0.6875rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    color: var(--text-muted);
                    text-align: center;
                    white-space: nowrap;
                }

                .wizard-step--active .wizard-step__label,
                .wizard-step--completed .wizard-step__label {
                    color: var(--emerald);
                }

                .wizard-step--completed .wizard-step__label {
                    color: var(--text-secondary);
                }

                /* Wizard Panels */
                .wizard-panel {
                    display: none;
                    animation: panelFadeIn var(--transition-med) ease-out;
                }

                .wizard-panel--active {
                    display: block;
                }

                @keyframes panelFadeIn {
                    from { opacity: 0; transform: translateX(16px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                /* Scrollbar */
                *::-webkit-scrollbar { width: 8px; height: 8px; }
                *::-webkit-scrollbar-track { background: var(--bg-base); }
                *::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 4px; border: 2px solid var(--bg-base); }
                *::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
                *::-webkit-scrollbar-corner { background: var(--bg-base); }

                /* Utilities */
                .flex { display: flex; }
                .flex-col { flex-direction: column; }
                .items-center { align-items: center; }
                .justify-between { justify-content: space-between; }
                .gap-sm { gap: 8px; }
                .gap-md { gap: 12px; }
                .gap-lg { gap: 16px; }
                .w-full { width: 100%; }
                .mt-sm { margin-top: 8px; }
                .mt-md { margin-top: 16px; }
                .mt-lg { margin-top: 24px; }
                .mb-sm { margin-bottom: 8px; }
                .mb-md { margin-bottom: 16px; }
            </style>

            <div class="forge-root">
                <!-- FORGE MODE -->
                <div id="section-forge" class="forge-section" style="display: block;">
                    <div class="workspace">
                        <!-- LEFT: Educator Controls -->
                        <div class="panel panel--elev-2">
                            <div class="panel__header">
                                <h2 class="panel__title">
                                    <span class="panel__icon">🔥</span>
                                    Educator Controls
                                </h2>
                            </div>
                            <div class="panel__body">
                                <div class="form-group">
                                    <label class="form-label" for="blueprint-select">Parent Blueprint</label>
                                    <select class="neo-select w-full" id="blueprint-select" aria-describedby="blueprint-desc">
                                        <option value="">Loading blueprints…</option>
                                    </select>
                                    <p id="blueprint-desc" class="text-muted mt-sm">Select a clinical scenario template to customize</p>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Demographic Age Range</label>
                                    <div class="range-row">
                                        <input type="number" id="age-min" class="neo-input" value="50" min="18" max="100" placeholder="Min" aria-label="Minimum age">
                                        <span class="text-muted">to</span>
                                        <input type="number" id="age-max" class="neo-input" value="85" min="18" max="100" placeholder="Max" aria-label="Maximum age">
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="noise-density">Isomorphic Noise Density</label>
                                    <select class="neo-select w-full" id="noise-density">
                                        <option value="Low">Low — Clean Academic Baseline</option>
                                        <option value="Medium" selected>Medium — Standard Clinical Noise</option>
                                        <option value="High">High — High-Acuity / Distractor Heavy</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label class="neo-checkbox">
                                        <input type="checkbox" id="poa-mutation">
                                        <span class="neo-checkbox__box" aria-hidden="true"></span>
                                        <span class="neo-checkbox__label">
                                            <strong>Mutation Vector:</strong> Shift Sepsis Onset to Post-Admission (POA Mutation)
                                        </span>
                                    </label>
                                </div>

                                <button class="neo-btn neo-btn--primary w-full mt-lg" id="forge-btn" type="button">
                                    <span>🔥</span> Forge Scenario & Synthesize EHR
                                </button>
                            </div>
                        </div>

                        <!-- RIGHT: Live Output Preview -->
                        <div class="panel panel--elev-4">
                            <div class="panel__header">
                                <h2 class="panel__title">
                                    <span class="panel__icon">📄</span>
                                    Live Preview
                                </h2>
                            </div>
                            <div class="panel__body">
                                <div class="tab-bar" role="tablist" aria-label="Preview tabs">
                                    <button class="tab-btn tab-btn--active" id="tab-ehr" role="tab" aria-selected="true" aria-controls="panel-ehr">Synthesized EHR Chart</button>
                                    <button class="tab-btn" id="tab-gold" role="tab" aria-selected="false" aria-controls="panel-gold">Gold Standard Claims</button>
                                </div>

                                <div id="panel-ehr" role="tabpanel" aria-labelledby="tab-ehr">
                                    <div class="preview-body preview-body--empty" id="preview-text">
                                        Configure educator parameters and click <strong>Forge Scenario</strong> to synthesize a live medical case…
                                    </div>
                                </div>

                                <div id="panel-gold" role="tabpanel" aria-labelledby="tab-gold" hidden>
                                    <div class="preview-body preview-body--empty" id="preview-gold">
                                        Gold standard claims mapping will appear here after forging…
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- CREATE MODE (Wizard) -->
                <div id="section-create" class="create-section" style="display: none;">
                    <div class="alert" id="create-alert" role="alert" aria-live="polite"></div>

                    <nav class="wizard-stepper" aria-label="Blueprint creation steps">
                        <div class="wizard-step wizard-step--active" data-step="1" role="step" aria-current="step">
                            <div class="wizard-step__circle">1</div>
                            <span class="wizard-step__label">Identity</span>
                        </div>
                        <div class="wizard-step" data-step="2" role="step">
                            <div class="wizard-step__circle">2</div>
                            <span class="wizard-step__label">Demographics</span>
                        </div>
                        <div class="wizard-step" data-step="3" role="step">
                            <div class="wizard-step__circle">3</div>
                            <span class="wizard-step__label">Noise Pool</span>
                        </div>
                        <div class="wizard-step" data-step="4" role="step">
                            <div class="wizard-step__circle">4</div>
                            <span class="wizard-step__label">Clinical</span>
                        </div>
                        <div class="wizard-step" data-step="5" role="step">
                            <div class="wizard-step__circle">5</div>
                            <span class="wizard-step__label">Gold Standard</span>
                        </div>
                        <div class="wizard-step" data-step="6" role="step">
                            <div class="wizard-step__circle">6</div>
                            <span class="wizard-step__label">Export</span>
                        </div>
                    </nav>

                    <div class="workspace">
                        <!-- LEFT: Form Steps -->
                        <div class="panel panel--elev-2" style="min-height: 600px;">
                            <div class="panel__header">
                                <h2 class="panel__title">
                                    <span class="panel__icon">✨</span>
                                    Blueprint Builder
                                </h2>
                            </div>
                            <div class="panel__body" style="flex: 1; overflow-y: auto;">
                                <!-- STEP 1: IDENTITY -->
                                <div class="wizard-panel wizard-panel--active" data-step="1" role="tabpanel" aria-labelledby="step1-label">
                                    <h3 id="step1-label" class="text-secondary mb-md" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;">Step 1 — Blueprint Identity</h3>
                                    <div class="form-group">
                                        <label class="form-label" for="bp-id">Blueprint ID *</label>
                                        <input type="text" id="bp-id" class="neo-input w-full" placeholder="BP-DOMAIN-CONCEPT-###" value="BP-NEW-CONDITION-001" aria-describedby="bp-id-help">
                                        <p id="bp-id-help" class="text-muted mt-sm">Unique identifier. Format: BP-DOMAIN-CONCEPT-###</p>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label" for="bp-domain">Clinical Domain *</label>
                                        <select class="neo-select w-full" id="bp-domain">
                                            <option value="Inpatient-Internal-Medicine">Inpatient — Internal Medicine</option>
                                            <option value="Inpatient-Cardiology">Inpatient — Cardiology</option>
                                            <option value="Inpatient-Neurology">Inpatient — Neurology</option>
                                            <option value="Inpatient-Pulmonology">Inpatient — Pulmonology</option>
                                            <option value="Inpatient-Orthopedics">Inpatient — Orthopedics</option>
                                            <option value="Inpatient-Surgery">Inpatient — Surgery</option>
                                            <option value="Inpatient-Oncology">Inpatient — Oncology</option>
                                            <option value="Inpatient-Nephrology">Inpatient — Nephrology</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label" for="bp-concept">Core Concept *</label>
                                        <input type="text" id="bp-concept" class="neo-input w-full" placeholder="e.g., Acute pancreatitis with systemic inflammation" aria-describedby="bp-concept-help">
                                        <p id="bp-concept-help" class="text-muted mt-sm">One-line clinical summary of the scenario</p>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label" for="bp-difficulty">Difficulty Level *</label>
                                        <select class="neo-select w-full" id="bp-difficulty">
                                            <option value="Introductory">Introductory</option>
                                            <option value="Moderate" selected>Moderate</option>
                                            <option value="Advanced">Advanced</option>
                                            <option value="Expert">Expert</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- STEP 2: DEMOGRAPHICS -->
                                <div class="wizard-panel" data-step="2" role="tabpanel" aria-labelledby="step2-label" hidden>
                                    <h3 id="step2-label" class="text-secondary mb-md" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;">Step 2 — Demographics Rules</h3>
                                    <div class="form-group">
                                        <label class="form-label">Age Range *</label>
                                        <div class="range-row">
                                            <input type="number" id="bp-age-min" class="neo-input" value="50" min="0" max="120" placeholder="Min" aria-label="Minimum age">
                                            <span class="text-muted">to</span>
                                            <input type="number" id="bp-age-max" class="neo-input" value="85" min="0" max="120" placeholder="Max" aria-label="Maximum age">
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Genders *</label>
                                        <div class="flex gap-md mt-sm">
                                            <label class="neo-checkbox">
                                                <input type="checkbox" id="bp-gender-f" checked>
                                                <span class="neo-checkbox__box" aria-hidden="true"></span>
                                                <span class="neo-checkbox__label">Female (F)</span>
                                            </label>
                                            <label class="neo-checkbox">
                                                <input type="checkbox" id="bp-gender-m" checked>
                                                <span class="neo-checkbox__box" aria-hidden="true"></span>
                                                <span class="neo-checkbox__label">Male (M)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <!-- STEP 3: NOISE POOL -->
                                <div class="wizard-panel" data-step="3" role="tabpanel" aria-labelledby="step3-label" hidden>
                                    <h3 id="step3-label" class="text-secondary mb-md" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;">Step 3 — Isomorphic Noise Pool</h3>
                                    <p class="text-muted mb-md">Variability injected into each generated case for realism</p>

                                    <div class="form-group">
                                        <label class="form-label">Social History Variants</label>
                                        <div id="social-history-array"></div>
                                        <button type="button" class="neo-btn neo-btn--secondary neo-btn--sm mt-sm" id="add-social-btn">+ Add Social History Variant</button>
                                    </div>

                                    <div class="form-group mt-lg">
                                        <label class="form-label">Chronic Condition Variants</label>
                                        <div id="chronic-conditions-array"></div>
                                        <button type="button" class="neo-btn neo-btn--secondary neo-btn--sm mt-sm" id="add-chronic-btn">+ Add Chronic Condition</button>
                                    </div>
                                </div>

                                <!-- STEP 4: CLINICAL TEMPLATE -->
                                <div class="wizard-panel" data-step="4" role="tabpanel" aria-labelledby="step4-label" hidden>
                                    <h3 id="step4-label" class="text-secondary mb-md" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;">Step 4 — Clinical Template</h3>

                                    <div class="form-group">
                                        <label class="form-label" for="bp-chief-complaint">Chief Complaint *</label>
                                        <input type="text" id="bp-chief-complaint" class="neo-input w-full" placeholder="e.g., Severe epigastric pain radiating to back, nausea, vomiting">
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">Vital Signs Ranges</label>
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                                            <div class="form-group">
                                                <label class="form-label">Temp (°F)</label>
                                                <div class="range-row">
                                                    <input type="number" id="bp-temp-min" class="neo-input" value="100.5" step="0.1" min="95" max="108" placeholder="Min">
                                                    <span class="text-muted">to</span>
                                                    <input type="number" id="bp-temp-max" class="neo-input" value="102.5" step="0.1" min="95" max="108" placeholder="Max">
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Heart Rate (bpm)</label>
                                                <div class="range-row">
                                                    <input type="number" id="bp-hr-min" class="neo-input" value="100" min="40" max="180" placeholder="Min">
                                                    <span class="text-muted">to</span>
                                                    <input type="number" id="bp-hr-max" class="neo-input" value="118" min="40" max="180" placeholder="Max">
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Resp Rate</label>
                                                <div class="range-row">
                                                    <input type="number" id="bp-rr-min" class="neo-input" value="20" min="8" max="40" placeholder="Min">
                                                    <span class="text-muted">to</span>
                                                    <input type="number" id="bp-rr-max" class="neo-input" value="26" min="8" max="40" placeholder="Max">
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">BP Systolic</label>
                                                <div class="range-row">
                                                    <input type="number" id="bp-sys-min" class="neo-input" value="95" min="60" max="220" placeholder="Min">
                                                    <span class="text-muted">to</span>
                                                    <input type="number" id="bp-sys-max" class="neo-input" value="115" min="60" max="220" placeholder="Max">
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">BP Diastolic</label>
                                                <div class="range-row">
                                                    <input type="number" id="bp-dia-min" class="neo-input" value="55" min="30" max="140" placeholder="Min">
                                                    <span class="text-muted">to</span>
                                                    <input type="number" id="bp-dia-max" class="neo-input" value="70" min="30" max="140" placeholder="Max">
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">Lab Ranges</label>
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                                            <div class="form-group">
                                                <label class="form-label">WBC (K/µL)</label>
                                                <div class="range-row">
                                                    <input type="number" id="bp-wbc-min" class="neo-input" value="12.0" step="0.1" min="1" max="50" placeholder="Min">
                                                    <span class="text-muted">to</span>
                                                    <input type="number" id="bp-wbc-max" class="neo-input" value="18.0" step="0.1" min="1" max="50" placeholder="Max">
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Lactate (mmol/L)</label>
                                                <div class="range-row">
                                                    <input type="number" id="bp-lactate-min" class="neo-input" value="1.5" step="0.1" min="0.3" max="10" placeholder="Min">
                                                    <span class="text-muted">to</span>
                                                    <input type="number" id="bp-lactate-max" class="neo-input" value="3.5" step="0.1" min="0.3" max="10" placeholder="Max">
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Custom Lab 1 Name</label>
                                                <input type="text" id="bp-custom-lab1-name" class="neo-input" placeholder="e.g., BNP, Troponin, CRP">
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Custom Lab 1 Range</label>
                                                <div class="range-row">
                                                    <input type="number" id="bp-custom-lab1-min" class="neo-input" step="0.1" placeholder="Min">
                                                    <span class="text-muted">to</span>
                                                    <input type="number" id="bp-custom-lab1-max" class="neo-input" step="0.1" placeholder="Max">
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label" for="bp-chest-xray">Chest X-Ray Finding *</label>
                                        <textarea id="bp-chest-xray" class="neo-textarea w-full" placeholder="e.g., Left lower lobe opacity consistent with acute infiltrate/consolidation." rows="2">Left lower lobe opacity consistent with acute infiltrate/consolidation.</textarea>
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label" for="bp-assessment">Assessment / Hospital Course Narrative *</label>
                                        <textarea id="bp-assessment" class="neo-textarea w-full" placeholder="e.g., Severe sepsis secondary to community-acquired pneumonia. Patient was placed on sepsis resuscitation protocol..." rows="4">Severe sepsis secondary to community-acquired pneumonia. Patient was placed on sepsis resuscitation protocol with IV fluid boluses and started on broad-spectrum IV antibiotics (Ceftriaxone and Azithromycin). Supplemental oxygen titrated via nasal cannula. Chronic conditions were monitored and maintained on home medications.</textarea>
                                        <p class="text-muted mt-sm">This narrative is used directly in the generated EHR. Write it clinically.</p>
                                    </div>
                                </div>

                                <!-- STEP 5: GOLD STANDARD -->
                                <div class="wizard-panel" data-step="5" role="tabpanel" aria-labelledby="step5-label" hidden>
                                    <h3 id="step5-label" class="text-secondary mb-md" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;">Step 5 — Gold Standard Claims Mapping</h3>

                                    <div class="form-group">
                                        <label class="form-label">Principal Diagnosis *</label>
                                        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 12px;">
                                            <input type="text" id="bp-pdx-code" class="neo-input" value="A41.9" placeholder="A41.9" aria-label="ICD-10 code">
                                            <input type="text" id="bp-pdx-desc" class="neo-input" value="Sepsis, unspecified organism" placeholder="Description" aria-label="Description">
                                        </div>
                                        <label class="form-label mt-md">Rationale (Coding Guideline Citation)</label>
                                        <textarea id="bp-pdx-rationale" class="neo-textarea w-full" placeholder="e.g., Sepsis is present on admission (POA) and meets criteria for principal diagnosis under ICD-10-CM Guideline I.C.1.d.1.a." rows="2">Sepsis is present on admission (POA) and meets criteria for principal diagnosis under ICD-10-CM Guideline I.C.1.d.1.a.</textarea>
                                    </div>

                                    <div class="form-group mt-lg">
                                        <label class="form-label">Secondary Diagnoses</label>
                                        <div id="secondary-diagnoses-array"></div>
                                        <button type="button" class="neo-btn neo-btn--secondary neo-btn--sm mt-sm" id="add-secondary-btn">+ Add Secondary Diagnosis</button>
                                    </div>
                                </div>

                                <!-- STEP 6: EXPORT -->
                                <div class="wizard-panel" data-step="6" role="tabpanel" aria-labelledby="step6-label" hidden>
                                    <h3 id="step6-label" class="text-secondary mb-md" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;">Step 6 — Generate & Export</h3>

                                    <div class="flex gap-sm flex-wrap mb-md">
                                        <button class="neo-btn neo-btn--primary" id="btn-preview-yaml" type="button">👁️ Preview YAML</button>
                                        <button class="neo-btn neo-btn--secondary" id="btn-save-blueprint" type="button">💾 Save to Project</button>
                                        <button class="neo-btn neo-btn--secondary" id="btn-download-yaml" type="button">⬇️ Download .yaml</button>
                                    </div>

                                    <label class="form-label">YAML Output (Editable)</label>
                                    <textarea id="yaml-preview" class="yaml-editor w-full" placeholder="Click “Preview YAML” to generate…" spellcheck="false" aria-label="YAML preview editor"></textarea>
                                </div>

                                <!-- Wizard Navigation -->
                                <div class="flex justify-between mt-lg pt-md" style="border-top: 1px solid var(--border-subtle);">
                                    <button class="neo-btn neo-btn--ghost neo-btn--sm" id="wizard-prev" type="button" disabled>← Previous</button>
                                    <button class="neo-btn neo-btn--primary" id="wizard-next" type="button">Next →</button>
                                </div>
                            </div>
                        </div>

                        <!-- RIGHT: Live Preview / Reference -->
                        <div class="panel panel--elev-4" style="min-height: 600px;">
                            <div class="panel__header">
                                <h2 class="panel__title">
                                    <span class="panel__icon">📋</span>
                                    Live Preview & Reference
                                </h2>
                            </div>
                            <div class="panel__body">
                                <div class="preview-body" id="create-preview" style="min-height: 400px;">
                                    <div class="preview-body--empty">
                                        <strong>Live YAML Preview</strong><br><br>
                                        Fill in the wizard steps on the left. Click <strong>Preview YAML</strong> on Step 6 to see the generated blueprint here.<br><br>
                                        <span class="text-muted">All changes sync in real-time as you type.</span>
                                    </div>
                                </div>

                                <div class="mt-lg pt-lg" style="border-top: 1px solid var(--border-subtle);">
                                    <h4 class="text-secondary mb-sm" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;">Quick Reference</h4>
                                    <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.7;">
                                        <strong>Blueprint ID format:</strong> BP-DOMAIN-CONCEPT-###<br>
                                        <strong>CC/MCC types:</strong> None, CC, MCC (per CMS DRG logic)<br>
                                        <strong>POA values:</strong> Y (Present), N (Not present), U (Unknown)<br>
                                        <strong>Assessment field:</strong> Drives the generated EHR narrative directly<br>
                                        <strong>Noise pool:</strong> Social history + chronic conditions add isomorphic variability
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupArrayHandlers() {
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
            <div class="array-field__header">
                <span class="array-field__title">Variant ${index + 1}</span>
                <button type="button" class="array-field__remove" onclick="this.closest('.array-field').remove(); updateSocialIndices()">Remove</button>
            </div>
            <div class="form-group">
                <textarea id="social-${index}" class="neo-textarea w-full" placeholder="e.g., Denies history of tobacco, alcohol, or illicit drug use." rows="2"></textarea>
            </div>
        `;
        container.appendChild(field);
        this.updateSocialIndices();
    }

    updateSocialIndices() {
        const fields = this.shadowRoot.querySelectorAll('#social-history-array .array-field');
        fields.forEach((field, i) => {
            field.querySelector('.array-field__title').textContent = `Variant ${i + 1}`;
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
            <div class="array-field__header">
                <span class="array-field__title">Condition ${index + 1}</span>
                <button type="button" class="array-field__remove" onclick="this.closest('.array-field').remove(); updateChronicIndices()">Remove</button>
            </div>
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 12px;">
                <input type="text" id="chronic-code-${index}" class="neo-input" placeholder="I10" aria-label="ICD-10 code">
                <input type="text" id="chronic-desc-${index}" class="neo-input" placeholder="Essential hypertension" aria-label="Description">
            </div>
            <div class="form-group mt-sm">
                <label class="form-label">Clinical Marker (Narrative)</label>
                <textarea id="chronic-marker-${index}" class="neo-textarea w-full" placeholder="e.g., BP controlled on home Lisinopril 10mg daily." rows="2"></textarea>
            </div>
        `;
        container.appendChild(field);
        this.updateChronicIndices();
    }

    updateChronicIndices() {
        const fields = this.shadowRoot.querySelectorAll('#chronic-conditions-array .array-field');
        fields.forEach((field, i) => {
            field.querySelector('.array-field__title').textContent = `Condition ${i + 1}`;
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
            <div class="array-field__header">
                <span class="array-field__title">Secondary ${index + 1}</span>
                <button type="button" class="array-field__remove" onclick="this.closest('.array-field').remove(); updateSecondaryIndices()">Remove</button>
            </div>
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 12px;">
                <input type="text" id="bp-sdx-code-${index}" class="neo-input" placeholder="J18.9" aria-label="ICD-10 code">
                <input type="text" id="bp-sdx-desc-${index}" class="neo-input" placeholder="Pneumonia, unspecified organism" aria-label="Description">
            </div>
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 12px; margin-top: 12px;">
                <select id="bp-sdx-type-${index}" class="neo-select">
                    <option value="None">None</option>
                    <option value="CC">CC</option>
                    <option value="MCC">MCC</option>
                </select>
                <select id="bp-sdx-poa-${index}" class="neo-select">
                    <option value="Y">Y (Present on Admission)</option>
                    <option value="N">N (Not Present on Admission)</option>
                    <option value="U">U (Unknown)</option>
                </select>
            </div>
            <div class="form-group mt-sm">
                <label class="form-label">Rationale</label>
                <textarea id="bp-sdx-rationale-${index}" class="neo-textarea w-full" placeholder="e.g., Localized infection causing systemic response." rows="2"></textarea>
            </div>
        `;
        container.appendChild(field);
        this.updateSecondaryIndices();
    }

    updateSecondaryIndices() {
        const fields = this.shadowRoot.querySelectorAll('#secondary-diagnoses-array .array-field');
        fields.forEach((field, i) => {
            field.querySelector('.array-field__title').textContent = `Secondary ${i + 1}`;
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
        const previewGold = this.shadowRoot.getElementById('preview-gold');
        const panelEhr = this.shadowRoot.getElementById('panel-ehr');
        const panelGold = this.shadowRoot.getElementById('panel-gold');

        const btnPreviewYaml = this.shadowRoot.getElementById('btn-preview-yaml');
        const btnSaveBlueprint = this.shadowRoot.getElementById('btn-save-blueprint');
        const btnDownloadYaml = this.shadowRoot.getElementById('btn-download-yaml');
        const yamlPreview = this.shadowRoot.getElementById('yaml-preview');
        const alertEl = this.shadowRoot.getElementById('create-alert');
        const createPreview = this.shadowRoot.getElementById('create-preview');

        const wizardPrev = this.shadowRoot.getElementById('wizard-prev');
        const wizardNext = this.shadowRoot.getElementById('wizard-next');
        const wizardSteps = this.shadowRoot.querySelectorAll('.wizard-step');
        const wizardPanels = this.shadowRoot.querySelectorAll('.wizard-panel');

        const addSocialBtn = this.shadowRoot.getElementById('add-social-btn');
        const addChronicBtn = this.shadowRoot.getElementById('add-chronic-btn');
        const addSecondaryBtn = this.shadowRoot.getElementById('add-secondary-btn');

        let activeTab = "ehr";

        // Mode switcher
        modeForgeBtn.addEventListener('click', () => this.switchMode('forge'));
        modeCreateBtn.addEventListener('click', () => this.switchMode('create'));

        // Forge tab switching
        tabEhr.addEventListener('click', () => this.switchTab('ehr'));
        tabGold.addEventListener('click', () => this.switchTab('gold'));

        // Forge Scenario
        forgeBtn.addEventListener('click', async () => {
            const blueprintId = this.shadowRoot.getElementById('blueprint-select').value;
            const ageMin = parseInt(this.shadowRoot.getElementById('age-min').value) || 50;
            const ageMax = parseInt(this.shadowRoot.getElementById('age-max').value) || 85;
            const noiseDensity = this.shadowRoot.getElementById('noise-density').value;
            const poaMutation = this.shadowRoot.getElementById('poa-mutation').checked;

            if (!blueprintId) {
                this.showAlert('Please select a parent blueprint!', 'error');
                return;
            }

            try {
                forgeBtn.disabled = true;
                forgeBtn.innerHTML = '<span>⏳</span> Synthesizing EHR…';

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
                this.showAlert(`Forge synthesis failed: ${err.message}`, 'error');
            } finally {
                forgeBtn.disabled = false;
                forgeBtn.innerHTML = '<span>🔥</span> Forge Scenario & Synthesize EHR';
            }
        });

        // Wizard Navigation
        wizardNext.addEventListener('click', () => this.wizardNextStep());
        wizardPrev.addEventListener('click', () => this.wizardPrevStep());

        // Dynamic array buttons
        addSocialBtn.addEventListener('click', () => this.addSocialVariant());
        addChronicBtn.addEventListener('click', () => this.addChronicCondition());
        addSecondaryBtn.addEventListener('click', () => this.addSecondaryDiagnosis());

        // Initialize default array fields
        this.addSocialVariant();
        this.addSocialVariant();
        this.addChronicCondition();
        this.addChronicCondition();
        this.addSecondaryDiagnosis();
        this.addSecondaryDiagnosis();

        // Blueprint Creator: Preview YAML
        btnPreviewYaml.addEventListener('click', () => {
            const yaml = this.generateYAML();
            yamlPreview.value = yaml;
            this.updateCreatePreview(yaml);
            this.showAlert('YAML preview generated. Review and click Save or Download.', 'success');
        });

        // Live YAML preview as user types (debounced)
        let yamlDebounce = null;
        this.shadowRoot.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('input', () => {
                if (this.mode === 'create' && this.wizardStep === 6) {
                    clearTimeout(yamlDebounce);
                    yamlDebounce = setTimeout(() => {
                        const yaml = this.generateYAML();
                        yamlPreview.value = yaml;
                        this.updateCreatePreview(yaml);
                    }, 800);
                }
            });
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
                btnSaveBlueprint.disabled = true;
                btnSaveBlueprint.innerHTML = '<span>⏳</span> Saving…';

                const res = await fetch('/api/forge/blueprints/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ blueprint_id: bpId, yaml_content: yaml })
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Save failed');
                }

                this.showAlert(`Blueprint "${bpId}" saved successfully! Reloading blueprint list…`, 'success');
                await this.loadBlueprints();
            } catch (err) {
                console.error(err);
                this.showAlert(`Save failed: ${err.message}`, 'error');
            } finally {
                btnSaveBlueprint.disabled = false;
                btnSaveBlueprint.innerHTML = '💾 Save to Project';
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
    }

    switchMode(mode) {
        this.mode = mode;
        const sectionForge = this.shadowRoot.getElementById('section-forge');
        const sectionCreate = this.shadowRoot.getElementById('section-create');
        const modeForgeBtn = this.shadowRoot.getElementById('mode-forge-btn');
        const modeCreateBtn = this.shadowRoot.getElementById('mode-create-btn');

        if (mode === 'forge') {
            sectionForge.style.display = 'block';
            sectionCreate.style.display = 'none';
            modeForgeBtn.classList.add('mode-btn--active');
            modeForgeBtn.setAttribute('aria-selected', 'true');
            modeCreateBtn.classList.remove('mode-btn--active');
            modeCreateBtn.setAttribute('aria-selected', 'false');
        } else {
            sectionForge.style.display = 'none';
            sectionCreate.style.display = 'block';
            modeCreateBtn.classList.add('mode-btn--active');
            modeCreateBtn.setAttribute('aria-selected', 'true');
            modeForgeBtn.classList.remove('mode-btn--active');
            modeForgeBtn.setAttribute('aria-selected', 'false');
            this.wizardStep = 1;
            this.updateWizardUI();
        }
    }

    switchTab(tab) {
        const tabEhr = this.shadowRoot.getElementById('tab-ehr');
        const tabGold = this.shadowRoot.getElementById('tab-gold');
        const panelEhr = this.shadowRoot.getElementById('panel-ehr');
        const panelGold = this.shadowRoot.getElementById('panel-gold');

        if (tab === 'ehr') {
            activeTab = 'ehr';
            tabEhr.classList.add('tab-btn--active');
            tabEhr.setAttribute('aria-selected', 'true');
            tabGold.classList.remove('tab-btn--active');
            tabGold.setAttribute('aria-selected', 'false');
            panelEhr.hidden = false;
            panelGold.hidden = true;
        } else {
            activeTab = 'gold';
            tabGold.classList.add('tab-btn--active');
            tabGold.setAttribute('aria-selected', 'true');
            tabEhr.classList.remove('tab-btn--active');
            tabEhr.setAttribute('aria-selected', 'false');
            panelGold.hidden = false;
            panelEhr.hidden = true;
        }
        this.updatePreviewText();
    }

    updatePreviewText() {
        const previewText = this.shadowRoot.getElementById('preview-text');
        const previewGold = this.shadowRoot.getElementById('preview-gold');
        if (!this.currentScenario) return;

        const tabEhr = this.shadowRoot.getElementById('tab-ehr');
        const isEhr = tabEhr.classList.contains('tab-btn--active');

        if (isEhr) {
            previewText.innerText =
                `SCENARIO ID: ${this.currentScenario.scenario_id}\n` +
                `MUTATION STATUS: ${this.currentScenario.customization.poa_mutation_applied ? '⚠️ POA Shift Mutation Applied' : 'Standard Baseline'}\n` +
                `--------------------------------------------------\n\n` +
                this.currentScenario.synthesized_ehr.narrative;
        } else {
            previewGold.innerText = JSON.stringify(this.currentScenario.gold_standard, null, 2);
        }
    }

    updateCreatePreview(yaml) {
        const createPreview = this.shadowRoot.getElementById('create-preview');
        if (!yaml || !yaml.trim()) {
            createPreview.innerHTML = `
                <div class="preview-body--empty">
                    <strong>Live YAML Preview</strong><br><br>
                    Fill in the wizard steps on the left. Click <strong>Preview YAML</strong> on Step 6 to see the generated blueprint here.<br><br>
                    <span class="text-muted">All changes sync in real-time as you type.</span>
                </div>
            `;
            return;
        }
        createPreview.innerHTML = `<pre class="yaml-editor" style="white-space: pre-wrap; max-height: none;">${this.escapeHtml(yaml)}</pre>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showAlert(message, type) {
        const alertEl = this.shadowRoot.getElementById('create-alert');
        alertEl.textContent = message;
        alertEl.className = `alert alert--${type}`;
        alertEl.style.display = 'flex';
        setTimeout(() => { alertEl.style.display = 'none'; }, 5000);
    }

    wizardNextStep() {
        if (this.wizardStep < 6) {
            this.wizardStep++;
            this.updateWizardUI();
        }
    }

    wizardPrevStep() {
        if (this.wizardStep > 1) {
            this.wizardStep--;
            this.updateWizardUI();
        }
    }

    updateWizardUI() {
        const wizardSteps = this.shadowRoot.querySelectorAll('.wizard-step');
        const wizardPanels = this.shadowRoot.querySelectorAll('.wizard-panel');
        const wizardPrev = this.shadowRoot.getElementById('wizard-prev');
        const wizardNext = this.shadowRoot.getElementById('wizard-next');

        wizardSteps.forEach((step, i) => {
            const stepNum = i + 1;
            step.classList.remove('wizard-step--active', 'wizard-step--completed');
            if (stepNum < this.wizardStep) {
                step.classList.add('wizard-step--completed');
            } else if (stepNum === this.wizardStep) {
                step.classList.add('wizard-step--active');
            }
        });

        wizardPanels.forEach((panel, i) => {
            const stepNum = i + 1;
            if (stepNum === this.wizardStep) {
                panel.classList.add('wizard-panel--active');
                panel.hidden = false;
            } else {
                panel.classList.remove('wizard-panel--active');
                panel.hidden = true;
            }
        });

        wizardPrev.disabled = this.wizardStep === 1;
        wizardNext.innerText = this.wizardStep === 6 ? 'Finish' : 'Next →';
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
                labs: labs,
                assessment: assessment
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
                const escaped = value.replace(/"/g, '\\"');
                yaml += `${spaces}${key}: "${escaped}"\n`;
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }

        return yaml;
    }
}

customElements.define('scenario-forge-studio', ScenarioForgeStudio);
export default ScenarioForgeStudio;