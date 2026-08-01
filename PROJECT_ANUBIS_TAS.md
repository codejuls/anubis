# PROJECT ANUBIS: TECHNICAL ARCHITECTURE SPECIFICATION (TAS)
**Codename:** Anubis  
**Status:** Approved for Architectural Specification  
**Authors:** Hermit (Senior Software Architect & Senior Medical Coder/Educator)  
**Date:** August 1, 2026  
**Confidentiality:** STRICTLY CONFIDENTIAL - For Internal Use Only

---

## 1. Executive Summary & Persona Context

Project Anubis is an advanced educational ecosystem and daily workflow companion designed specifically for medical coders and educators. 

### 1.1 The Core Mission
1. **Upskill Junior Coders:** Bridge the steep gap between academic medical coding and real-world clinical documentation complexity.
2. **Eliminate Compliance Audits:** Ensure practicing coders stay continuously updated on annual clinical guidelines (ICD-10-CM/PCS, CPT/HCPCS) and AHA Coding Clinic rulings.
3. **On-the-Job Companion:** Provide an interactive, HIPAA-compliant "Shadow Sandbox" where coders can safely practice and test complex real-world coding dilemmas.

### 1.2 Dual-Persona Perspective
This specification is designed through a dual-lens:
* **Senior Software Architect:** Ensuring a highly scalable, decoupled, event-sourced, and cost-efficient architecture that minimizes dependencies and operates securely with zero infrastructure overhead.
* **Senior Medical Coder & Educator (CCS, CPC-I):** Grounding the system in the strict realities of clinical coding, pathophysiology, reimbursement systems (MS-DRGs/APCs), National Correct Coding Initiative (NCCI) guidelines, and educational pedagogy.

---

## 2. High-Level System Dynamics

Anubis is designed as a **Bidirectional, Event-Sourced Ecosystem** that separates unstructured medical narratives from structured clinical truth.

```
+--------------------------------------------------------------------------+
|                          THE ANUBIS SYSTEM PIPELINE                      |
+--------------------------------------------------------------------------+

  [FORWARD GENERATION FLOW]
  YAML Blueprint 
     |
     v
  Anubis Event Compiler ---> Clinical Event Store (Admission -> Discharge)
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
  LLM Narrative Generator                        Rules & DRG Grouper Engine
  (Synthesizes Medical Record)                   (Compiles "Gold Standard" JSON)
            |                                               |
            v                                               v
  De-identified Clinical Text                    Gold Standard Claims Data
  (H&P, Discharge Summary, Labs)                 (Codes, Sequences, Rationale)
            \                                               /
             \                                             /
              v                                           v
         +-----------------------------------------------------+
         |              The Anubis Interactive UI              |
         |         - Vanilla Web Components (Shadow DOM)       |
         |         - Micro-Frontend Sandboxed Interface        |
         +--------------------------+--------------------------+
                                    |
                                    v (User Interaction Telemetry)
  [THE CODER JOURNEY]               |
  User Event Store <----------------+
  (Logs: Highlight, Code, Hover, Hint, Sequence, Submit)
        |
        v
  Anubis Grading Engine & Analytics (F1-Score, Speed Curves, Cognitive Traps)
```

### 2.1 Forward Generation (Concept to Practice)
An educator specifies a high-level clinical concept (e.g., *Sepsis secondary to localized Pneumonia*). The system compiles this into an **Event-Sourced Clinical Timeline**, which then generates:
1. **The EHR Narrative:** A highly realistic, complex, clinical-noise-injected chart.
2. **The Gold Standard Solution:** The mathematically verified coding sequences and reimbursement mappings.

### 2.2 Reverse Synthesis (EHR to Ground Truth)
When an educator pastes a raw, public-domain clinical chart into Anubis, the clinical NLP parser abstracts it, identifies key entities, and generates the structured Ground Truth JSON automatically.

---

## 3. Data Models & Schemas

To ensure strict compliance with **Spec-Driven Development (SDD)**, all inputs and outputs are governed by structured schemas.

### 3.1 The Parent Case Blueprint Schema (YAML)
Defines the "clinical DNA" of the scenario, demographic ranges, and mutation vectors.

```yaml
blueprint_id: BP-SEPSIS-PNEUMONIA-001
domain: Inpatient-Internal-Medicine
core_concept: Sepsis secondary to localized Pneumonia

demographics_range:
  age_range: [50, 85]
  gender: ["M", "F"]

isomorphic_noise_rules:
  - category: "social_history"
    options: ["Former smoker, quit 10 years ago", "Occasional social alcohol use"]
  - category: "chronic_conditions"
    pool:
      - { code: "I10", desc: "Essential hypertension", clinical_marker: "BP 138/84 on home Lisinopril" }
      - { code: "M19.90", desc: "Osteoarthritis", clinical_marker: "Mild joint pain in knees" }

clinical_timeline_events:
  - event_id: EV-001
    type: Admission
    base_data:
      presentation: "Fever, cough, and progressive shortness of breath"
      vitals: { temp_range: [100.8, 102.1], hr_range: [100, 115], rr_range: [22, 26] }
      labs: { wbc_range: [13.0, 16.5], lactate_range: [2.1, 2.8] }

mutations:
  - mutation_id: MUT-POA-SHIFT
    description: "Shift Sepsis onset from Present-on-Admission to Post-Admission"
    impact: "Swaps Principal Diagnosis from Sepsis (A41.9) to Pneumonia (J18.9)"
    timeline_modifications:
      - target_event_id: EV-001
        modify:
          vitals: { temp_range: [98.6, 99.2], hr_range: [75, 85], rr_range: [16, 18] }
          labs: { wbc_range: [8.5, 10.2], lactate_range: [0.8, 1.2] }
```

### 3.2 The Gold Standard Claims Model (JSON)
The strict output payload of the rules engine, containing all answers, citations, and DRG metrics.

```json
{
  "case_id": "ANUBIS-2026-0001",
  "metadata": {
    "difficulty_level": "Moderate",
    "service_date": "2024-11-15",
    "patient": { "age": 68, "gender": "F", "discharge_status": "02" }
  },
  "gold_standard": {
    "principal_diagnosis": {
      "code": "A41.9",
      "description": "Sepsis, unspecified organism",
      "rationale": "Sepsis is POA. Sec. ICD-10-CM Guideline I.C.1.d.1.a."
    },
    "secondary_diagnoses": [
      { "code": "J18.9", "description": "Pneumonia", "type": "MCC", "rationale": "Sequence sec. to Sepsis." }
    ],
    "procedures": [],
    "reimbursement_impact": {
      "drg_grouper": "MS-DRG",
      "drg_code": "871",
      "drg_description": "SEPTICEMIA WITH MCC",
      "relative_weight": 1.7824
    },
    "educational_insights": {
      "coding_clinic_citations": [
        "AHA Coding Clinic for ICD-10-CM, Fourth Quarter 2023, Page 8"
      ]
    }
  }
}
```

### 3.3 The Coder Journey Event Schema (JSON)
Logs every action of the user inside the sandbox for playback and cognitive tracing.

```json
{
  "session_id": "SESS-9831",
  "events": [
    { "timestamp": "2026-08-01T12:00:00.000Z", "event_type": "CaseOpened", "data": { "case_id": "ANUBIS-2026-0001" } },
    { "timestamp": "2026-08-01T12:03:10.000Z", "event_type": "TextHighlighted", "data": { "text": "WBC of 14.5 and Lactate of 2.4" } },
    { "timestamp": "2026-08-01T12:05:15.000Z", "event_type": "DiagnosisAssigned", "data": { "code": "A41.9", "slot": "Principal" } }
  ]
}
```

---

## 4. The Intellectual Property & Reference Engine Strategy

Medical code sets and educational materials carry highly restrictive and expensive licensing. Anubis bypasses licensing hurdles during development and MVP rollout using a **Metadata Reference & Abstracted Logic Model**.

```
+-----------------------------------------------------------------------------+
|                      ANUBIS KNOWLEDGE REF MODEL                             |
+------------------------------------+----------------------------------------+
                                     |
         +---------------------------+---------------------------+
         |                                                       |
         v                                                       v
+----------------------------------+            +----------------------------------+
|    1. Metadata Citation Model    |            |   2. Abstracted Rule Engines     |
| - We never host copyrighted text |            | - We translate Coding Clinic     |
|   or PDFs (AHA Coding Clinic).   |            |   rules into pure logical edits  |
| - Displays exact citation indexes|            |   (e.g. conditional statements). |
|   (e.g., "Q4 2023, p8") for user |            | - Safe from copyright infring-   |
|   verification in existing books.|            |   ement, ensuring compliance.    |
+----------------------------------+            +----------------------------------+
```

* **No Bulk Databases Needed:** The MVP database holds **only the subset of codes** (approx. 200-300 codes) required by the designated MVP blueprints. We do not load, store, or license full national code book sets.

---

## 5. UI/UX Architecture: Vanilla Micro-Frontends

To ensure a lightning-fast, highly resilient UI with **zero dependency bloat**, the frontend is built entirely using **Vanilla JavaScript Custom Web Components (ESM) with Shadow DOM encapsulation**.

### 5.1 Custom Web Component Directory Structure
```
/frontend
  ├── index.html
  ├── /components
  │    ├── ClinicalChartViewer.js  # Text renderer, handles highlights & scroll telemetry
  │    ├── CodeEntryForm.js        # Input manager for principal/secondary codes & modifiers
  │    ├── TelemetryPanel.js       # Live gauges tracking Speed, Accuracy, CC/MCC impact
  │    └── UIWizards.js            # Simplified case generator UI cards for stakeholders
  ├── /css
  │    └── style.css               # Clean, high-performance UI stylesheet (Modern Dark-Mode)
  └── /tests
       ├── qunit-runner.html       # Pure component-level unit test harness
       └── e2e/                    # Playwright end-to-end integration tests
```

### 5.2 Stakeholder UX Simplifiers (Wizards & Cartography)
* **The "Forge Case" Wizard:** An elegant visual multi-step setup card replacing complex configurations.
* **The Clinical Code Cartograph:** Dynamic DOM mind-map tree views. Clicking on a diagnosis in the narrative expands a visual diagnostic node path showing parent-child hierarchy levels to simplify specific code choices.

---

## 6. Testing & Quality Assurance Plan

Verification is built into every layer of Anubis to guarantee **Production-Quality** and exact clinical logic:

```
+--------------------------------------------------------------------------+
|                       THE THREE-TIER TEST PIPELINE                       |
+--------------------------------------------------------------------------+

  1. Backend API & Schema (Python / Pytest)
     [FastAPI Contracts] -> [Pydantic Validation] -> [Deterministic Asserts]
     (Verifies that generated Gold Standard claims are syntactically and clinically valid)
     
  2. Component-Level Units (HTML/JS / QUnit)
     [Shadow DOM Rendering] -> [Event Dispatching] -> [Isolated Telemetry Logs]
     (Verifies Web Components run flawlessly without npm compile or bundler dependencies)
     
  3. End-to-End User Journeys (Node / Playwright)
     [Headless Chromium] -> [Simulated Highlights] -> [Grading & Score Verification]
     (Verifies complete ecosystem integrity from DB state to interactive UI changes)
```

---

## 7. Deployment, Security & Remote Demo Strategy

To showcase Anubis safely to stakeholders without high-cost cloud deployments or firewall vulnerability exposure, we use an integrated **Docker Compose + Cloudflare Access Tunnel** stack.

```
                  +----------------------------------------+
                  |           Developer's Laptop           |
                  |                                        |
                  |    +------------------------------+    |
                  |    |     Docker Compose Stack     |    |
                  |    |  [FastAPI] <-> [Vanilla UI]  |    |
                  |    +--------------+---------------+    |
                  +-------------------|--------------------+
                                      | (Secure outbound SSL tunnel)
                                      v
                        +---------------------------+
                        |  Cloudflare Edge Gateway  |
                        +-------------+-------------+
                                      |
                                      | (Gated by OTP Email Verification)
                                      v
                        +---------------------------+
                        |  STAKEHOLDER / USER WEB   |
                        +---------------------------+
```

### 7.1 Key Infrastructure Characteristics:
* **Zero Infrastructure Spend:** The Cloudflare Tunnel is **100% free**. No hosting bills, no DNS security fees, and no remote VM maintenance costs during the MVP phase.
* **Instant Gated Authentication:** Using Cloudflare Zero Trust, we can authorize specific stakeholders by email. When they visit our tunnel address, Cloudflare manages OTP (One-Time-PIN) delivery automatically. Unauthorized visitors are blocked at the Cloudflare Edge before ever hitting your local Docker stack.

---

## 8. MVP Development Roadmap & Budget

A lean, high-velocity timeline targeting a launch in **14 Weeks**.

### 8.1 MoSCoW Feature Breakdown
* **MUST HAVE:** Structured Blueprints, LLM Narrative Generator, Zero-PHI Demographics, Vanilla Web Components Sandbox UI, Accurate Grading & Local Telemetry Logs, hardcoded MS-DRG logic for 5 core domains.
* **SHOULD HAVE:** Progressive AI Co-pilot hints, AHA Coding Clinic exact metadata citations.
* **COULD HAVE:** Event-sourced clinical history timelines, Case cloning.
* **WONT HAVE (Deferred):** Full-scale official database integrations, live billing system adapters, automatic EDI X12 exports.

### 8.2 Weekly Sprint Milestones
* **Weeks 1-2:** Setup base Docker container pipelines, define Case YAML Blueprints & Pydantic Schemas. Run backend `pytest` tests.
* **Weeks 3-5:** Develop forward LLM prompt generators. Test narrative consistency & clinical noise injection.
* **Weeks 6-8:** Build Vanilla JS Custom Web Components, QUnit runner harness, and beautiful, simple UI elements.
* **Weeks 9-10:** Program the Grading & Scoring Core. Construct Mock MS-DRG algorithms for MVP case sets.
* **Weeks 11-12:** Set up the Cloudflare Secure Tunnel, run Playwright E2E integration tests, write test scripts.
* **Weeks 13-14:** Run full Educator & Coder Simulation loops, execute UI adjustments, and open gated Remote Demo access to Stakeholders.

---

## 9. Conclusion & Sign-Off

This Technical Architecture Specification represents a cohesive, pragmatic, and production-quality approach to delivering **Project Anubis**. 

By bypassing expensive licensing, utilizing a zero-build-step vanilla frontend, and securing demo distribution through an encrypted tunnel, we ensure that every dollar in our budget is focused directly on the core intellectual property—the **Anubis Generative and Grading Core**.

**Do you approve of this Technical Architecture Specification? Shall I save this file as our master reference and begin structuring the development environment?**
