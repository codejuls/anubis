class TelemetryPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.customGoldStandard = null;
    }

    connectedCallback() {
        this.renderDefault();
    }

    setGoldStandard(goldStandard) {
        this.customGoldStandard = goldStandard;
    }

    resetDefault() {
        this.customGoldStandard = null;
        this.renderDefault();
    }

    renderDefault() {
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

                .waiting-state {
                    color: var(--fg-subtle, #6c757d);
                    font-style: italic;
                    text-align: center;
                    padding: 32px 16px;
                    font-size: 0.875rem;
                    line-height: 1.5;
                }
            </style>
            <h2>Telemetry & Grading Core</h2>
            <div class="waiting-state">
                No active case submitted. Select a case in the sandbox to begin abstracting.
            </div>
        `;
    }

    showResult(result, studentPayload) {
        const defaultGold = {
            principal_diagnosis: { code: "A41.9", description: "Sepsis, unspecified organism" },
            secondary_diagnoses: [{ code: "J18.9", description: "Pneumonia, unspecified organism", type: "MCC" }],
            weight: 1.7824
        };

        const activeGold = this.customGoldStandard || defaultGold;
        const goldPdx = activeGold.principal_diagnosis.code.toUpperCase().trim();
        const goldSdxCodes = activeGold.secondary_diagnoses.map(d => d.code.toUpperCase().trim());
        const studentPdx = studentPayload.case_data.principal_diagnosis.code.toUpperCase().trim();
        const studentSdx = studentPayload.case_data.secondary_diagnoses.map(d => d.code.toUpperCase().trim());
        const studentHospital = studentPayload.hospital_id;

        let baseRate = 7200.0;
        if (studentHospital === "HOSP-URBAN-001") baseRate = 7500.0;
        else if (studentHospital === "HOSP-SUBURBAN-002") baseRate = 6800.0;
        else if (studentHospital === "HOSP-RURAL-003") baseRate = 5900.0;

        const goldPayment = Math.round(1.7824 * baseRate * 100) / 100;

        const pdxMatched = studentPdx === goldPdx;
        const missingMCC = goldSdxCodes.some(c => !studentSdx.includes(c));

        let score = 0;
        let gradingStatus = "";
        let gradingClass = "";
        let gapAnalysisHtml = "";

        if (pdxMatched && !missingMCC) {
            score = 100;
            gradingStatus = "PERFECT GOLD STANDARD MATCH";
            gradingClass = "badge-success";
        } else if (pdxMatched && missingMCC) {
            score = 50;
            gradingStatus = "WARNING: MISSED SECONDARY MCC (PNEUMONIA)";
            gradingClass = "badge-warning";
            const gap = Math.round((goldPayment - result.price_result) * 100) / 100;
            gapAnalysisHtml = `
                <div class="gap-card">
                    <div class="gap-title">Revenue Leakage / Financial Gap Analysis</div>
                    <div style="font-size: 0.875rem; margin-top: 6px;">
                        By missing the secondary <strong>Pneumonia code (J18.9)</strong>, which acts as a <strong>Major Complication or Comorbidity (MCC)</strong>, the case was downgraded from MS-DRG 871 to MS-DRG 872.
                    </div>
                    <div class="gap-values">
                        <span>Gold Standard Payment: <strong>$${goldPayment.toLocaleString()}</strong></span>
                        <span>Your Payment: <strong>$${result.price_result.toLocaleString()}</strong></span>
                        <span style="color: var(--danger, #c92a2a);">Lost Reimbursement: <strong>-$${gap.toLocaleString()}</strong></span>
                    </div>
                </div>
            `;
        } else if (!pdxMatched) {
            score = 20;
            gradingStatus = "CRITICAL ERROR: INCORRECT PRINCIPAL DIAGNOSIS";
            gradingClass = "badge-error";
            const gap = Math.round((goldPayment - result.price_result) * 100) / 100;
            gapAnalysisHtml = `
                <div class="gap-card">
                    <div class="gap-title">Revenue Leakage / Compliance Alert</div>
                    <div style="font-size: 0.875rem; margin-top: 6px;">
                        Under <strong>ICD-10-CM Guideline I.C.1.d.1.a</strong>, if sepsis is present on admission and meets principal diagnosis criteria, the systemic infection (A41.9) must be sequenced first. You sequenced <strong>${studentPdx}</strong> as principal.
                    </div>
                    <div class="gap-values">
                        <span>Gold Standard Payment: <strong>$${goldPayment.toLocaleString()}</strong></span>
                        <span>Your Payment: <strong>$${result.price_result.toLocaleString()}</strong></span>
                        <span style="color: var(--danger, #c92a2a);">Difference: <strong>-$${gap.toLocaleString()}</strong></span>
                    </div>
                </div>
            `;
        }

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

                .dashboard {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .metric-card {
                    background: var(--bg, #f8f9fa);
                    border: 1px solid var(--border, #ced4da);
                    border-radius: var(--radius, 6px);
                    padding: 12px 14px;
                }

                .metric-label {
                    font-size: 0.625rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: var(--fg-subtle, #6c757d);
                }

                .metric-value {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--fg, #1a1d1c);
                    margin-top: 4px;
                }

                .metric-desc {
                    font-size: 0.75rem;
                    color: var(--fg-subtle, #6c757d);
                    margin-top: 2px;
                    font-weight: 500;
                }

                .badge-status {
                    display: block;
                    padding: 10px 14px;
                    border-radius: var(--radius, 6px);
                    font-size: 0.8125rem;
                    font-weight: 600;
                    text-align: center;
                    margin-bottom: 16px;
                }

                .badge-success {
                    background: var(--primary-light, #d1fae5);
                    color: var(--primary, #059669);
                    border: 1px solid var(--primary, #059669);
                }

                .badge-warning {
                    background: #fef3c7;
                    color: #92400e;
                    border: 1px solid #fbbf24;
                }

                .badge-error {
                    background: var(--danger-light, #fdeaea);
                    color: var(--danger, #c92a2a);
                    border: 1px solid var(--danger, #c92a2a);
                }

                .gap-card {
                    background: var(--danger-light, #fdeaea);
                    border: 1px solid var(--danger, #c92a2a);
                    border-radius: var(--radius, 6px);
                    padding: 14px;
                    margin-bottom: 16px;
                }

                .gap-title {
                    font-weight: 600;
                    font-size: 0.75rem;
                    color: var(--danger, #c92a2a);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    margin-bottom: 8px;
                }

                .gap-values {
                    display: flex;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-top: 10px;
                    font-size: 0.8125rem;
                    padding-top: 10px;
                    border-top: 1px solid rgba(201, 42, 42, 0.15);
                    font-weight: 600;
                }

                .educational-rationale {
                    background: var(--bg, #f8f9fa);
                    border: 1px solid var(--border, #ced4da);
                    border-radius: var(--radius, 6px);
                    padding: 14px;
                    font-size: 0.8125rem;
                    line-height: 1.6;
                    color: var(--fg, #1a1d1c);
                }

                .educational-rationale h3 {
                    margin: 0 0 8px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--primary, #059669);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
            </style>

            <h2>Telemetry & Grading Core</h2>

            <div class="dashboard">
                <div class="metric-card">
                    <div class="metric-label">Calculated MS-DRG</div>
                    <div class="metric-value" style="color: var(--primary, #059669);">${result.grouper_result.drg_code}</div>
                    <div class="metric-desc">${result.grouper_result.drg_description}</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Relative DRG Weight</div>
                    <div class="metric-value" style="color: var(--primary, #059669);">${result.grouper_result.relative_weight.toFixed(4)}</div>
                    <div class="metric-desc">Severity: <strong>${result.grouper_result.complication_level}</strong></div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Facility Reimbursement</div>
                    <div class="metric-value" style="color: var(--primary, #059669);">$${result.price_result.toLocaleString()}</div>
                    <div class="metric-desc">MDC: <strong>${result.grouper_result.mdc_code}</strong></div>
                </div>
            </div>

            <div class="badge-status ${gradingClass}">
                ${gradingStatus} — Score: ${score}/100
            </div>

            ${gapAnalysisHtml}

            <div class="educational-rationale">
                <h3>Clinical Coder Rationale</h3>
                <strong>ICD-10-CM Guideline I.C.1.d.1.a (Sepsis Sequencing):</strong><br>
                When sepsis is Present on Admission (POA) and meets the definition of principal diagnosis, sequence code <strong>A41.9 (Sepsis)</strong> first, followed by the localized infection (e.g., <strong>J18.9 Pneumonia</strong>) as a secondary diagnosis.<br><br>
                <strong>Complication Severity Rule:</strong><br>
                Simple Pneumonia (J18.9) is classified as a <strong>Major Complication or Comorbidity (MCC)</strong>. Retaining this secondary code increases the case weight from 0.9831 (MS-DRG 872) to 1.7824 (MS-DRG 871), nearly doubling the facility's reimbursement while maintaining compliance.
            </div>
        `;
    }
}

customElements.define('telemetry-panel', TelemetryPanel);
export default TelemetryPanel;