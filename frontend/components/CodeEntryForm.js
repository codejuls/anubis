class CodeEntryForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.secondaryCount = 0;
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
                    background: rgba(255, 255, 255, 0.82);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(16, 185, 129, 0.22);
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 8px 32px 0 rgba(16, 185, 129, 0.05);
                }

                h2 {
                    margin-top: 0;
                    color: #059669; /* Deep Emerald */
                    font-size: 18px;
                    border-bottom: 2px solid rgba(16, 185, 129, 0.1);
                    padding-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 700;
                }

                h2 span {
                    color: #10b981; /* Mint accent symbol */
                }

                .form-group {
                    margin-bottom: 15px;
                }

                label {
                    display: block;
                    font-size: 13px;
                    color: #0f291e; /* Deep Jade Charcoal */
                    margin-bottom: 6px;
                    font-weight: 600;
                }

                input, select {
                    width: 100%;
                    box-sizing: border-box;
                    background: rgba(236, 253, 245, 0.5); /* Soft glass mint tint */
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 6px;
                    padding: 8px 12px;
                    color: #0f291e;
                    font-size: 14px;
                    font-family: inherit;
                    transition: all 0.2s;
                }

                input:focus, select:focus {
                    outline: none;
                    border-color: #059669;
                    background: #ffffff;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }

                .secondary-row {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 10px;
                    align-items: center;
                }

                .btn {
                    cursor: pointer;
                    font-weight: 700;
                    border-radius: 6px;
                    padding: 8px 14px;
                    font-size: 13px;
                    border: none;
                    transition: all 0.2s;
                }

                .btn-secondary {
                    background: rgba(236, 253, 245, 0.6);
                    color: #047857;
                    border: 1px solid rgba(16, 185, 129, 0.25);
                }

                .btn-secondary:hover {
                    background: #d1fae5;
                    color: #065f46;
                }

                .btn-danger {
                    background: #fee2e2;
                    color: #991b1b;
                    border: 1px solid #fca5a5;
                }

                .btn-danger:hover {
                    background: #fca5a5;
                    color: #7f1d1d;
                }

                /* Edgy and Modern Cyber Green Accent Button */
                .btn-primary {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: #ffffff;
                    width: 100%;
                    padding: 10px;
                    font-size: 14px;
                    margin-top: 15px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
                }

                .btn-primary:hover {
                    background: linear-gradient(135deg, #059669, #047857);
                    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
                }

                .quick-helpers {
                    margin-top: 10px;
                    font-size: 12.5px;
                    color: #475569;
                }

                .helper-chip {
                    display: inline-block;
                    background: rgba(209, 250, 229, 0.8); /* Glass mint tint */
                    color: #047857;                       /* Dark emerald text */
                    padding: 3px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 5px;
                    margin-top: 5px;
                    font-weight: 600;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }

                .helper-chip:hover {
                    background: #a7f3d0;
                    color: #065f46;
                }
            </style>

            <h2><span>𓋹</span> Abstractor Workspace</h2>
            
            <div class="form-group">
                <label for="pdx">Principal Diagnosis Code (ICD-10-CM)</label>
                <input type="text" id="pdx" placeholder="e.g. A41.9" value="">
                <div class="quick-helpers">
                    💡 Click to load: 
                    <span class="helper-chip" data-code="A41.9">A41.9 (Sepsis)</span>
                    <span class="helper-chip" data-code="J18.9">J18.9 (Pneumonia)</span>
                </div>
            </div>

            <div class="form-group">
                <label>Secondary Diagnosis Codes (ICD-10-CM)</label>
                <div id="secondary-container">
                    <!-- Rows will be added here -->
                </div>
                <button type="button" class="btn btn-secondary" id="add-secondary-btn" style="width: 100%; margin-top: 5px;">
                    ➕ Add Secondary Diagnosis
                </button>
            </div>

            <div class="form-group">
                <label for="hospital">Hospital Facility & Reimbursement Rate</label>
                <select id="hospital">
                    <option value="HOSP-URBAN-001">HOSP-URBAN-001 (Urban Academic Medical Center — Base: $7,500)</option>
                    <option value="HOSP-SUBURBAN-002">HOSP-SUBURBAN-002 (Suburban Community — Base: $6,800)</option>
                    <option value="HOSP-RURAL-003">HOSP-RURAL-003 (Rural Critical Access — Base: $5,900)</option>
                </select>
            </div>

            <button class="btn btn-primary" id="submit-claim-btn">
                𓁔 Submit Case to Grading Core
            </button>
        `;
    }

    setupFormListeners() {
        const addBtn = this.shadowRoot.getElementById('add-secondary-btn');
        const container = this.shadowRoot.getElementById('secondary-container');
        const submitBtn = this.shadowRoot.getElementById('submit-claim-btn');

        // Handler to add a secondary diagnosis row
        addBtn.addEventListener('click', () => {
            this.addSecondaryRow("");
        });

        // Quick helper chips
        this.shadowRoot.querySelectorAll('.helper-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const code = e.target.getAttribute('data-code');
                this.shadowRoot.getElementById('pdx').value = code;
            });
        });

        // Submit form
        submitBtn.addEventListener('click', () => {
            const pdxCode = this.shadowRoot.getElementById('pdx').value.trim();
            if (!pdxCode) {
                alert("Please specify a Principal Diagnosis code!");
                return;
            }

            const secondaryCodes = [];
            this.shadowRoot.querySelectorAll('.secondary-input').forEach(input => {
                const code = input.value.trim();
                if (code) {
                    secondaryCodes.push({ code: code, present_on_admission: true });
                }
            });

            const hospitalId = this.shadowRoot.getElementById('hospital').value;

            // Compile the exact payload matching GrouperRequest + hospital_id
            const payload = {
                case_data: {
                    age: 68,
                    gender: "F",
                    discharge_status: "01",
                    principal_diagnosis: { code: pdxCode, present_on_admission: true },
                    secondary_diagnoses: secondaryCodes,
                    procedures: [],
                    service_date: "2026-08-01"
                },
                hospital_id: hospitalId
            };

            // Dispatch custom event ClaimSubmitted
            const submitEvent = new CustomEvent('ClaimSubmitted', {
                detail: payload,
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(submitEvent);
        });
    }

    addSecondaryRow(initialValue = "") {
        const container = this.shadowRoot.getElementById('secondary-container');
        const rowId = `sec-row-${this.secondaryCount++}`;
        
        const row = document.createElement('div');
        row.className = 'secondary-row';
        row.id = rowId;
        row.innerHTML = `
            <input type="text" class="secondary-input" placeholder="e.g. J18.9" value="${initialValue}" style="flex: 1;">
            <button type="button" class="btn btn-danger delete-row-btn" data-target="${rowId}">❌</button>
        `;

        container.appendChild(row);

        // Bind delete action
        row.querySelector('.delete-row-btn').addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-target');
            const targetRow = this.shadowRoot.getElementById(targetId);
            if (targetRow) {
                targetRow.remove();
            }
        });
    }

    // Programmatic method to append secondary code from highlight action
    appendSecondaryCode(code) {
        this.addSecondaryRow(code);
    }
}

customElements.define('code-entry-form', CodeEntryForm);
export default CodeEntryForm;
