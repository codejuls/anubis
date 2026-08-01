class ClinicalChartViewer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupHighlightListener();
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

                .chart-content {
                    background: rgba(247, 249, 246, 0.85); /* Frosted warm cream */
                    border: 1px solid rgba(16, 185, 129, 0.15);
                    border-radius: 8px;
                    padding: 16px;
                    font-family: "Courier New", Courier, monospace;
                    line-height: 1.7;
                    font-size: 14.5px;
                    color: #0f291e; /* Deep Jade Charcoal */
                    white-space: pre-line;
                    user-select: text;
                    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.02);
                }

                /* Edgy and modern Cyber Emerald highlighter look */
                .chart-content::selection {
                    background: rgba(16, 185, 129, 0.25); /* Mint-Green glass alpha */
                    color: #065f46;                      /* Rich deep forest-mint */
                }

                .metadata {
                    font-size: 12.5px;
                    color: #475569;
                    margin-bottom: 12px;
                }
            </style>

            <h2><span>𓇚</span> Clinical Record Viewer</h2>
            <div class="metadata" id="case-meta">Case ID: <strong>ANUBIS-BP-SEPSIS-PNEUMONIA-001-DEFAULT</strong> | Type: Inpatient Discharge Summary</div>
            <div class="chart-content" id="chart-text">
CHIEF COMPLAINT: Shortness of breath and fever.

HISTORY OF PRESENT ILLNESS: The patient is a 68-year-old female with a history of COPD who presents with worsening dyspnea. Admitting vitals: Temp 102.1°F, Heart Rate 112 bpm, Respiratory Rate 24 bpm, Blood Pressure 102/58 mmHg. 

LABORATORY FINDINGS: White Blood Cell (WBC) count is elevated at 14.5 K/uL. Initial serum Lactate is 2.4 mmol/L. Chest X-ray demonstrates a left lower lobe consolidate infiltrate.

ASSESSMENT/PLAN: Community-acquired pneumonia with sepsis. Initiated IV fluids and broad-spectrum antibiotics (Ceftriaxone and Azithromycin). Oxygen therapy titrated to maintain SpO2 > 92%.
            </div>
        `;
    }

    // Dynamic method to update chart content when a new case is generated
    updateChart(caseId, chartText) {
        const meta = this.shadowRoot.getElementById('case-meta');
        const content = this.shadowRoot.getElementById('chart-text');
        
        if (meta) {
            meta.innerHTML = `Case ID: <strong>${caseId}</strong> | Type: Inpatient Discharge Summary`;
        }
        if (content) {
            content.innerText = chartText;
        }
    }

    setupHighlightListener() {
        this.shadowRoot.addEventListener('mouseup', () => {
            const selection = this.shadowRoot.getSelection ? this.shadowRoot.getSelection() : window.getSelection();
            const selectedText = selection.toString().trim();

            if (selectedText.length > 0) {
                // Dispatch native custom event upstream
                const highlightEvent = new CustomEvent('TextHighlighted', {
                    detail: { text: selectedText },
                    bubbles: true,
                    composed: true
                });
                this.dispatchEvent(highlightEvent);
            }
        });
    }
}

customElements.define('clinical-chart-viewer', ClinicalChartViewer);
export default ClinicalChartViewer;
