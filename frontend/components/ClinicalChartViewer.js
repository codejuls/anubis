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
                    background: var(--bg-card, #fff);
                    border: 1px solid var(--border, #ced4da);
                    border-radius: var(--radius, 6px);
                    padding: 16px;
                }

                h2 {
                    margin: 0 0 12px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--fg, #1a1d1c);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }

                .chart-content {
                    background: var(--bg, #f8f9fa);
                    border: 1px solid var(--border, #ced4da);
                    border-radius: var(--radius-sm, 4px);
                    padding: 14px;
                    font-family: var(--font-mono, "JetBrains Mono", monospace);
                    line-height: 1.65;
                    font-size: 0.8125rem;
                    color: var(--fg, #1a1d1c);
                    white-space: pre-line;
                    user-select: text;
                    max-height: 420px;
                    overflow-y: auto;
                }

                .chart-content::selection {
                    background: var(--primary-focus, rgba(5, 150, 105, 0.25));
                    color: var(--fg, #1a1d1c);
                }

                .metadata {
                    font-size: 0.75rem;
                    color: var(--fg-subtle, #6c757d);
                    margin-bottom: 10px;
                    font-family: var(--font-mono, "JetBrains Mono", monospace);
                }
            </style>

            <h2>Clinical Record</h2>
            <div class="metadata" id="case-meta">Case ID: <strong>ANUBIS-BP-SEPSIS-PNEUMONIA-001-DEFAULT</strong> | Inpatient Discharge Summary</div>
            <div class="chart-content" id="chart-text">
CHIEF COMPLAINT: Shortness of breath and fever.

HISTORY OF PRESENT ILLNESS: The patient is a 68-year-old female with a history of COPD who presents with worsening dyspnea. Admitting vitals: Temp 102.1°F, Heart Rate 112 bpm, Respiratory Rate 24 bpm, Blood Pressure 102/58 mmHg.

LABORATORY FINDINGS: White Blood Cell (WBC) count is elevated at 14.5 K/uL. Initial serum Lactate is 2.4 mmol/L. Chest X-ray demonstrates a left lower lobe consolidate infiltrate.

ASSESSMENT/PLAN: Community-acquired pneumonia with sepsis. Initiated IV fluids and broad-spectrum antibiotics (Ceftriaxone and Azithromycin). Oxygen therapy titrated to maintain SpO2 > 92%.
            </div>
        `;
    }

    updateChart(caseId, chartText) {
        const meta = this.shadowRoot.getElementById('case-meta');
        const content = this.shadowRoot.getElementById('chart-text');

        if (meta) {
            meta.innerHTML = `Case ID: <strong>${caseId}</strong> | Inpatient Discharge Summary`;
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