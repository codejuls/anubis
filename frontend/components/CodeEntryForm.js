class CodeEntryForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.secondaryCount = 0;
        this.procedureCount = 0;
    }

    connectedCallback() {
        this.render();
        this.setupFormListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: var(--bg-card, #fff);
                    border: 1px solid var(--border, #ced4da);
                    border-radius: var(--radius, 6px);
                    padding: 16px;
                }

                h2 {
                    margin: 0 0 16px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--fg, #1a1d1c);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }

                .form-group { margin-bottom: 14px; }

                label {
                    display: block;
                    font-size: 0.6875rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: var(--fg-muted, #343a40);
                    margin-bottom: 6px;
                    position: relative;
                    padding-left: 24px;
                }

                /* Add button inline with label */
                .add-btn {
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: var(--primary, #059669);
                    color: #fff;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 700;
                    line-height: 1;
                    transition: background 120ms ease, transform 120ms ease;
                    flex-shrink: 0;
                }
                .add-btn:hover { background: var(--primary-hover, #047857); transform: translateY(-50%) scale(1.1); }
                .add-btn:active { transform: translateY(-50%) scale(0.95); }

                /* Diagnosis/Procedure list with vertical connector */
                .code-list {
                    position: relative;
                    padding-left: 8px;
                    margin-top: 8px;
                }
                /* Vertical line - starts at top of list, goes to bottom */
                .code-list::before {
                    content: "";
                    position: absolute;
                    left: 7px;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: var(--border, #ced4da);
                    border-radius: 1px;
                }

                .code-row {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                    padding-left: 16px;
                }
                /* Horizontal tick from vertical line to input */
                .code-row::before {
                    content: "";
                    position: absolute;
                    left: -1px;  /* Start at vertical line position within code-row coords */
                    top: 50%;
                    width: 17px;  /* From vertical line to input start */
                    height: 2px;
                    background: var(--border, #ced4da);
                }

                input, select {
                    width: 100%;
                    box-sizing: border-box;
                    background: #fff;
                    border: 1px solid var(--border, #ced4da);
                    border-radius: var(--radius-sm, 4px);
                    padding: 10px 12px;
                    font-size: 0.875rem;
                    color: var(--fg, #1a1d1c);
                    font-family: inherit;
                    transition: border-color 120ms ease, box-shadow 120ms ease;
                }

                input:focus, select:focus {
                    outline: none;
                    border-color: var(--primary, #059669);
                    box-shadow: 0 0 0 3px var(--primary-focus, rgba(5, 150, 105, 0.25));
                }

                input::placeholder { color: var(--fg-subtle, #6c757d); }

                .code-input { flex: 1; min-width: 100px; }
                .poa-select { width: 140px; flex-shrink: 0; }

                .remove-btn {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: var(--danger-light, #fdeaea);
                    color: var(--danger, #c92a2a);
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    line-height: 1;
                    flex-shrink: 0;
                    transition: background 120ms ease, color 120ms ease;
                }
                .remove-btn:hover { background: var(--danger, #c92a2a); color: #fff; }

                .btn {
                    cursor: pointer;
                    font-weight: 500;
                    border-radius: var(--radius-sm, 4px);
                    padding: 8px 14px;
                    font-size: 0.8125rem;
                    border: none;
                    font-family: inherit;
                    transition: all 120ms ease;
                }

                .btn-primary {
                    background: var(--primary, #059669);
                    color: #fff;
                    width: 100%;
                    padding: 10px 18px;
                    font-size: 0.8125rem;
                    margin-top: 16px;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }

                .btn-primary:hover { background: var(--primary-hover, #047857); }

                .quick-helpers { margin-top: 8px; font-size: 0.75rem; color: var(--fg-subtle, #6c757d); }

                .helper-chip {
                    display: inline-block;
                    background: var(--primary-light, #d1fae5);
                    color: var(--primary, #059669);
                    padding: 3px 8px;
                    border-radius: var(--radius-sm, 4px);
                    cursor: pointer;
                    margin-right: 6px;
                    margin-top: 6px;
                    font-weight: 600;
                    font-size: 0.75rem;
                    border: 1px solid var(--primary, #059669);
                }

                .helper-chip:hover { background: var(--primary, #059669); color: #fff; }
            </style>

            <h2>Abstractor Workspace</h2>

            <div class="form-group">
                <label for="pdx">Principal Diagnosis Code (ICD-10-CM)</label>
                <input type="text" id="pdx" placeholder="e.g. A41.9" value="">
                <div class="quick-helpers">
                    Quick load:
                    <span class="helper-chip" data-code="A41.9">A41.9 Sepsis</span>
                    <span class="helper-chip" data-code="J18.9">J18.9 Pneumonia</span>
                </div>
            </div>

            <div class="form-group">
                <label>Secondary Diagnoses
                    <button type="button" class="add-btn" id="add-secondary-btn" aria-label="Add secondary diagnosis">+</button>
                </label>
                <div class="code-list" id="secondary-container"></div>
            </div>

            <div class="form-group">
                <label>Procedures
                    <button type="button" class="add-btn" id="add-procedure-btn" aria-label="Add procedure">+</button>
                </label>
                <div class="code-list" id="procedure-container"></div>
            </div>

            <div class="form-group">
                <label for="hospital">Hospital Facility & Reimbursement Rate</label>
                <select id="hospital">
                    <option value="HOSP-URBAN-001">HOSP-URBAN-001 (Urban Academic — Base: $7,500)</option>
                    <option value="HOSP-SUBURBAN-002">HOSP-SUBURBAN-002 (Suburban Community — Base: $6,800)</option>
                    <option value="HOSP-RURAL-003">HOSP-RURAL-003 (Rural Critical Access — Base: $5,900)</option>
                </select>
            </div>

            <button class="btn btn-primary" id="submit-claim-btn">Submit Case for Grading</button>
        `;
    }

    resetForm() {
        const pdxInput = this.shadowRoot.getElementById('pdx');
        if (pdxInput) pdxInput.value = "";

        const secondaryContainer = this.shadowRoot.getElementById('secondary-container');
        if (secondaryContainer) secondaryContainer.innerHTML = "";

        const procedureContainer = this.shadowRoot.getElementById('procedure-container');
        if (procedureContainer) procedureContainer.innerHTML = "";

        this.secondaryCount = 0;
        this.procedureCount = 0;
    }

    setupFormListeners() {
        const addSecondaryBtn = this.shadowRoot.getElementById('add-secondary-btn');
        const addProcedureBtn = this.shadowRoot.getElementById('add-procedure-btn');
        const submitBtn = this.shadowRoot.getElementById('submit-claim-btn');

        addSecondaryBtn.addEventListener('click', () => { this.addSecondaryRow(""); });
        addProcedureBtn.addEventListener('click', () => { this.addProcedureRow(""); });

        this.shadowRoot.querySelectorAll('.helper-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const code = e.target.getAttribute('data-code');
                this.shadowRoot.getElementById('pdx').value = code;
            });
        });

        submitBtn.addEventListener('click', () => {
            const pdxCode = this.shadowRoot.getElementById('pdx').value.trim();
            if (!pdxCode) { alert("Please specify a Principal Diagnosis code!"); return; }

            const secondaryCodes = [];
            this.shadowRoot.querySelectorAll('.secondary-row').forEach(row => {
                const code = row.querySelector('.code-input').value.trim();
                const poa = row.querySelector('.poa-select').value;
                if (code) secondaryCodes.push({ code: code, present_on_admission: poa === 'Y' });
            });

            const procedures = [];
            this.shadowRoot.querySelectorAll('.procedure-row').forEach(row => {
                const code = row.querySelector('.code-input').value.trim();
                if (code) procedures.push({ code: code });
            });

            const hospitalId = this.shadowRoot.getElementById('hospital').value;

            const payload = {
                case_data: {
                    age: 68,
                    gender: "F",
                    discharge_status: "01",
                    principal_diagnosis: { code: pdxCode, present_on_admission: true },
                    secondary_diagnoses: secondaryCodes,
                    procedures: procedures,
                    service_date: "2026-08-01"
                },
                hospital_id: hospitalId
            };

            const submitEvent = new CustomEvent('ClaimSubmitted', {
                detail: payload,
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(submitEvent);
        });
    }

    addSecondaryRow(initialCode = "", initialPoa = "Y") {
        const container = this.shadowRoot.getElementById('secondary-container');
        const rowId = `sec-row-${this.secondaryCount++}`;

        const row = document.createElement('div');
        row.className = 'code-row secondary-row';
        row.id = rowId;
        row.innerHTML = `
            <input type="text" class="code-input" placeholder="Code (e.g. J18.9)" value="${initialCode}">
            <select class="poa-select">
                <option value="Y" ${initialPoa === 'Y' ? 'selected' : ''}>Y — Present on Admission</option>
                <option value="N" ${initialPoa === 'N' ? 'selected' : ''}>N — Not Present on Admission</option>
                <option value="U" ${initialPoa === 'U' ? 'selected' : ''}>U — Unknown</option>
            </select>
            <button type="button" class="remove-btn" data-target="${rowId}" aria-label="Remove">✕</button>
        `;

        container.appendChild(row);

        row.querySelector('.remove-btn').addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-target');
            const targetRow = this.shadowRoot.getElementById(targetId);
            if (targetRow) targetRow.remove();
        });
    }

    addProcedureRow(initialCode = "") {
        const container = this.shadowRoot.getElementById('procedure-container');
        const rowId = `proc-row-${this.procedureCount++}`;

        const row = document.createElement('div');
        row.className = 'code-row procedure-row';
        row.id = rowId;
        row.innerHTML = `
            <input type="text" class="code-input" placeholder="Procedure code (e.g. 02RF33Z)" value="${initialCode}">
            <button type="button" class="remove-btn" data-target="${rowId}" aria-label="Remove">✕</button>
        `;

        container.appendChild(row);

        row.querySelector('.remove-btn').addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-target');
            const targetRow = this.shadowRoot.getElementById(targetId);
            if (targetRow) targetRow.remove();
        });
    }

    appendSecondaryCode(code, poa = "Y") {
        this.addSecondaryRow(code, poa);
    }
}

customElements.define('code-entry-form', CodeEntryForm);
export default CodeEntryForm;