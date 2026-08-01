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

                .waiting-state {
                    color: #475569;
                    font-style: italic;
                    text-align: center;
                    padding: 40px 10px;
                    font-size: 14.5px;
                }
            </style>
            <h2><span>𓇵</span> Anubis Live Telemetry & Grading Core</h2>
            <div class="waiting-state">
                No active case submitted. Submit a claim in the abstractor workspace to calculate MS-DRG groupings, pricing, and view grading feedback...
            </div>
        `;
    }

    showResult(result, studentPayload) {
        // Use custom gold standard if set, otherwise fallback to default Sepsis/Pneumonia
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

        // Calculate gold standard payment for student selected hospital
        let goldPayment = 0;
        let baseRate = 7200.0;
        if (studentHospital === "HOSP-URBAN-001") baseRate = 7500.0;
        else if (studentHospital === "HOSP-SUBURBAN-002") baseRate = 6800.0;
        else if (studentHospital === "HOSP-RURAL-003") baseRate = 5900.0;

        goldPayment = Math.round(1.7824 * baseRate * 100) / 100;

        // Grade accuracy
        const pdxMatched = studentPdx === goldPdx;
        const missingMCC = goldSdxCodes.some(c => !studentSdx.includes(c));

        let score = 0;
        let gradingStatus = "";
        let gradingClass = "";
        let gapAnalysisHtml = "";

        if (pdxMatched && !missingMCC) {
            score = 100;
            gradingStatus = "🏆 PERFECT GOLD STANDARD MATCH!";
            gradingClass = "badge-success";
        } else if (pdxMatched && missingMCC) {
            score = 50;
            gradingStatus = "⚠️ WARNING: MISSED SECONDARY MCC (PNEUMONIA)";
            gradingClass = "badge-warning";
            const gap = Math.round((goldPayment - result.price_result) * 100) / 100;
            gapAnalysisHtml = `
                <div class="gap-card">
                    <div class="gap-title">💸 Revenue Leakage / Financial Gap Analysis</div>
                    <div style="font-size: 14px; margin-top: 5px;">
                        By missing the secondary <strong>Pneumonia code (J18.9)</strong>, which acts as a <strong>Major Complication or Comorbidity (MCC)</strong>, the case was downgraded from MS-DRG 871 to MS-DRG 872.
                    </div>
                    <div class="gap-values">
                        <span>Gold Standard Payment: <strong>$${goldPayment.toLocaleString()}</strong></span>
                        <span>Your Payment: <strong>$${result.price_result.toLocaleString()}</strong></span>
                        <span style="color: #dc2626;">Lost Reimbursement: <strong>-$${gap.toLocaleString()}</strong></span>
                    </div>
                </div>
            `;
        } else if (!pdxMatched) {
            score = 20;
            gradingStatus = "❌ CRITICAL ERROR: INCORRECT PRINCIPAL DIAGNOSIS";
            gradingClass = "badge-error";
            const gap = Math.round((goldPayment - result.price_result) * 100) / 100;
            gapAnalysisHtml = `
                <div class="gap-card">
                    <div class="gap-title">💸 Revenue Leakage / Compliance Alert</div>
                    <div style="font-size: 14px; margin-top: 5px;">
                        Under <strong>ICD-10-CM Guideline I.C.1.d.1.a</strong>, if sepsis is present on admission and meets principal diagnosis criteria, the systemic infection (A41.9) must be sequenced first. You sequenced <strong>${studentPdx}</strong> as principal.
                    </div>
                    <div class="gap-values">
                        <span>Gold Standard Payment: <strong>$${goldPayment.toLocaleString()}</strong></span>
                        <span>Your Payment: <strong>$${result.price_result.toLocaleString()}</strong></span>
                        <span style="color: #dc2626;">Difference: <strong>-$${gap.toLocaleString()}</strong></span>
                    </div>
                </div>
            `;
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: rgba(255, 255, 255, 0.82);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(16, 185, 129, 0.22);
                    border-radius: 12px;
                    padding: 22px;
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

                .dashboard {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-top: 15px;
                }

                .metric-card {
                    background: rgba(247, 249, 246, 0.85); /* Warm cream glass */
                    border: 1px solid rgba(16, 185, 129, 0.15);
                    border-radius: 8px;
                    padding: 12px 15px;
                }

                .metric-label {
                    font-size: 11px;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 700;
                }

                .metric-value {
                    font-size: 22px;
                    font-weight: 800;
                    color: #0f291e; /* Deep Jade Charcoal */
                    margin-top: 4px;
                }

                .metric-desc {
                    font-size: 12px;
                    color: #475569;
                    margin-top: 2px;
                    font-weight: 500;
                }

                .badge-status {
                    display: inline-block;
                    padding: 10px 14px;
                    border-radius: 8px;
                    font-size: 13.5px;
                    font-weight: 700;
                    margin-top: 15px;
                    text-align: center;
                    width: 100%;
                    box-sizing: border-box;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);
                }

                /* Edgy cyber green match badge */
                .badge-success {
                    background: #d1fae5;
                    color: #065f46;
                    border: 1px solid #10b981;
                }

                .badge-warning {
                    background: #fef3c7;
                    color: #92400e;
                    border: 1px solid #fbbf24;
                }

                .badge-error {
                    background: #fee2e2;
                    color: #991b1b;
                    border: 1px solid #f87171;
                }

                .gap-card {
                    margin-top: 20px;
                    background: rgba(220, 38, 38, 0.01);
                    border: 1px solid rgba(220, 38, 38, 0.15);
                    border-radius: 8px;
                    padding: 15px;
                }

                .gap-title {
                    font-weight: 700;
                    font-size: 13px;
                    color: #b91c1c;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .gap-values {
                    display: flex;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    margin-top: 10px;
                    font-size: 13.5px;
                    border-top: 1px solid rgba(220, 38, 38, 0.08);
                    padding-top: 10px;
                    font-weight: 600;
                }

                .educational-rationale {
                    margin-top: 15px;
                    background: rgba(247, 249, 246, 0.85); /* Warm cream glass */
                    border: 1px solid rgba(16, 185, 129, 0.15);
                    border-radius: 8px;
                    padding: 15px;
                    font-size: 13.5px;
                    line-height: 1.6;
                    color: #0f291e;
                }

                .educational-rationale h3 {
                    margin-top: 0;
                    font-size: 13px;
                    color: #059669;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 700;
                }
            </style>

            <h2><span>𓇵</span> Anubis Live Telemetry & Grading Core</h2>

            <div class="dashboard">
                <div class="metric-card">
                    <div class="metric-label">Calculated MS-DRG</div>
                    <div class="metric-value" style="color: #059669;">${result.grouper_result.drg_code}</div>
                    <div class="metric-desc">${result.grouper_result.drg_description}</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Relative DRG Weight</div>
                    <div class="metric-value" style="color: #047857;">${result.grouper_result.relative_weight.toFixed(4)}</div>
                    <div class="metric-desc">Severity Level: <strong>${result.grouper_result.complication_level}</strong></div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Facility Reimbursement</div>
                    <div class="metric-value" style="color: #10b981;">$${result.price_result.toLocaleString()}</div>
                    <div class="metric-desc">MDC Category: <strong>${result.grouper_result.mdc_code}</strong></div>
                </div>
            </div>

            <div class="badge-status ${gradingClass}">
                ${gradingStatus} — SCORE: ${score}/100
            </div>

            ${gapAnalysisHtml}

            <div class="educational-rationale">
                <h3>📖 Clinical Coder Rationale Card</h3>
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
