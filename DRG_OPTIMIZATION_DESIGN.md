# DRG Optimization Feature Design Document
**Project Anubis — DRG Optimizer Module**  
**Version:** 1.0  
**Status:** Draft for Review  
**Date:** August 2026  
**Classification:** STRICTLY CONFIDENTIAL

---

## 1. Executive Summary

### 1.1 Purpose
The DRG Optimizer is a decision-support module that helps medical coders evaluate whether a current inpatient claim can be optimized (i.e., reassigned to a higher-weight DRG) through:
- **Clinical documentation review** — identifying missing specificity, combination codes, or hierarchy opportunities
- **Query opportunity identification** — flagging where physician queries could clarify documentation to support a higher-weighted DRG
- **Fiscal-year grounded guidance** — all recommendations tied to the CMS MS-DRG grouper logic and ICD-10-CM/PCS guidelines effective for the claim's discharge date

### 1.2 Core Value Proposition
> *"Given this case's DRG, diagnoses, procedures, service dates, and discharge status, Anubis tells the coder exactly what to look for in the medical record—and whether it's worth querying the physician—to potentially shift to a higher-reimbursing DRG."*

### 1.3 Target Users
- **Junior Coders** — learning which clinical indicators drive DRG shifts
- **Senior Coders** — validating optimization hypotheses before investing query time
- **CDI Specialists** — prioritizing concurrent review targets
- **Educators** — teaching DRG optimization methodology with real cases

---

## 2. Functional Requirements

### 2.1 Input: The Optimization Context
```json
{
  "case_data": {
    "age": 68,
    "gender": "F",
    "discharge_status": "01",
    "principal_diagnosis": { "code": "A41.9", "present_on_admission": true },
    "secondary_diagnoses": [
      { "code": "J18.9", "present_on_admission": true },
      { "code": "I10", "present_on_admission": true }
    ],
    "procedures": [
      { "code": "02RF33Z", "date_of_service": "2026-08-01" }
    ],
    "service_date": "2026-08-15"
  },
  "current_drg": {
    "drg_code": "871",
    "drg_description": "SEPTICEMIA OR SEVERE SEPSIS WITHOUT MV >96 HOURS WITH MCC",
    "relative_weight": 1.7824
  },
  "hospital_id": "HOSP-URBAN-001"
}
```

### 2.2 Output: The Optimization Analysis
```json
{
  "optimization_potential": "HIGH",
  "current_reimbursement": 13368.00,
  "target_drg_candidates": [
    {
      "drg_code": "870",
      "drg_description": "SEPTICEMIA OR SEVERE SEPSIS WITH MV >96 HOURS",
      "relative_weight": 3.4521,
      "reimbursement_delta": 12456.00,
      "probability": "MEDIUM",
      "requirements": [
        "Documentation of mechanical ventilation >96 hours",
        "ICD-10-PCS code 5A1955Z (mechanical ventilation >96 hours) must be present"
      ],
      "query_recommendations": [
        {
          "question": "Was the patient on mechanical ventilation for more than 96 consecutive hours?",
          "clinical_indicators": ["Ventilator logs showing >96 hrs", "Respiratory therapy notes", "ICU flow sheets"],
          "icd10_guideline_ref": "ICD-10-PCS Guideline B3.1a",
          "coding_clinic_ref": "AHA Coding Clinic, Q1 2024, p.12"
        }
      ]
    },
    {
      "drg_code": "871",  // Current DRG
      "drg_description": "SEPTICEMIA OR SEVERE SEPSIS WITHOUT MV >96 HOURS WITH MCC",
      "relative_weight": 1.7824,
      "reimbursement_delta": 0,
      "probability": "HIGH",
      "requirements": [],
      "query_recommendations": []
    }
  ],
  "documentation_gaps": [
    {
      "category": "Sepsis Severity",
      "current_code": "A41.9",
      "gap": "Unspecified organism — consider more specific sepsis code if culture data exists",
      "action": "Review microbiology reports for identified organism",
      "icd10_guideline_ref": "I.C.1.d.1.a",
      "potential_impact": "May support same DRG but with higher specificity for quality metrics"
    },
    {
      "category": "MCC Capture",
      "current_code": "J18.9",
      "gap": "Pneumonia unspecified — consider J13-J16 if organism identified",
      "action": "Check sputum culture, blood culture, PCR panel results",
      "icd10_guideline_ref": "I.C.1.b.1",
      "coding_clinic_ref": "AHA Coding Clinic, Q3 2023, p.8",
      "potential_impact": "Maintains MCC status; specificity supports medical necessity"
    }
  ],
  "query_worthiness_score": 8.5,
  "query_worthiness_rationale": "High reimbursement delta ($12K) with achievable documentation requirement (vent hours). Moderate probability based on ICU LOS of 5 days.",
  "fiscal_year_context": {
    "fiscal_year": "FY2026",
    "grouper_version": "MS-DRG v43",
    "effective_date": "2025-10-01",
    "guideline_version": "ICD-10-CM/PCS FY2026"
  }
}
```

### 2.3 Core Capabilities

| Capability | Description |
|------------|-------------|
| **DRG Shift Detection** | Identifies all DRGs reachable from current principal diagnosis + procedure combination by adding/removing MCCs/CCs, changing PDx sequencing, or adding procedures |
| **Documentation Gap Analysis** | Maps current codes to clinical documentation requirements for target DRGs |
| **Physician Query Recommendations** | Generates specific, compliant query templates with clinical indicators to search for |
| **Fiscal Year Grounding** | All logic uses MS-DRG definitions, ICD-10-CM/PCS codes, and guidelines effective for the claim's discharge date |
| **Reimbursement Impact Calculation** | Computes $ delta using hospital-specific base rate + DRG relative weight |
| **Probability Scoring** | Estimates likelihood of successful DRG shift based on clinical indicators present in record |

---

## 3. Architecture & Data Flow

### 3.1 High-Level Data Flow
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DRG OPTIMIZER PIPELINE                           │
└─────────────────────────────────────────────────────────────────────────┘

  Input: GrouperRequest + Current DRG Result + Hospital ID
           │
           ▼
  ┌──────────────────────────────────────────┐
  │  Fiscal Year Resolver                     │
  │  - service_date → FY (Oct 1 - Sep 30)    │
  │  - Loads FY-specific DRG weights,        │
  │    ICD-10-CM/PCS code sets, guidelines   │
  └──────────────────────────────────────────┘
           │
           ▼
  ┌──────────────────────────────────────────┐
  │  DRG Neighborhood Explorer                │
  │  - Given current PDx + procedures,       │
  │    enumerate all DRGs in same MDC        │
  │    reachable via MCC/CC add/drop,        │
  │    PDx swap, procedure addition          │
  │  - Uses FY-specific MS-DRG logic         │
  └──────────────────────────────────────────┘
           │
           ▼
  ┌──────────────────────────────────────────┐
  │  Clinical Requirement Mapper              │
  │  - For each target DRG, map required     │
  │    clinical criteria (from DRG            │
  │    definitions + CMS DRG descriptors)    │
  │  - Cross-reference with current codes    │
  │    to identify gaps                      │
  └──────────────────────────────────────────┘
           │
           ▼
  ┌──────────────────────────────────────────┐
  │  Guideline & Coding Clinic Engine         │
  │  - Query FY2026 guideline index for      │
  │    relevant coding rules (I.C.1.d, etc.) │
  │  - Surface Coding Clinic citations       │
  │    for documentation requirements        │
  └──────────────────────────────────────────┘
           │
           ▼
  ┌──────────────────────────────────────────┐
  │  Query Opportunity Scorer                 │
  │  - Score each gap:                       │
  │    * Reimbursement delta ($)             │
  │    * Clinical achievability (0-10)       │
  │    * Compliance risk (low/med/high)      │
  │    * Query clarity (specific question)   │
  └──────────────────────────────────────────┘
           │
           ▼
  Output: OptimizationAnalysis (JSON)
```

### 3.2 Integration Points
| Component | Integration Method |
|-----------|-------------------|
| **AnubisMockGrouper** | Reuse existing `group_case()` to validate target DRG hypotheses |
| **AnubisMockPricer** | Reuse `price_case()` for reimbursement delta calculations |
| **FY2026GuidelineIndex** | Extend existing `search_by_code()` for DRG-relevant guidelines |
| **ClinicalNLPParser** | Future: parse clinical notes for missing documentation evidence |

---

## 4. Knowledge Base Requirements

### 4.1 DRG Weight Tables (Per Fiscal Year)
**Source:** CMS MS-DRG Relative Weight Files (Public Domain)
**Structure:**
```json
{
  "fy2026": {
    "metadata": {
      "effective_start": "2025-10-01",
      "effective_end": "2026-09-30",
      "grouper_version": "v43",
      "source_url": "https://www.cms.gov/medicare/coding/icd10/ms-drg-classification"
    },
    "drg_weights": {
      "870": { "description": "SEPTICEMIA OR SEVERE SEPSIS WITH MV >96 HOURS", "weight": 3.4521, "mdc": "18" },
      "871": { "description": "SEPTICEMIA OR SEVERE SEPSIS WITHOUT MV >96 HOURS WITH MCC", "weight": 1.7824, "mdc": "18" },
      "872": { "description": "SEPTICEMIA OR SEVERE SEPSIS WITHOUT MV >96 HOURS WITHOUT MCC", "weight": 0.9831, "mdc": "18" }
    },
    "mdc_hierarchy": {
      "18": { "name": "Infectious and Parasitic Diseases", "drg_range": "870-872" }
    }
  }
}
```

### 4.2 DRG Clinical Criteria (Per Fiscal Year)
**Source:** CMS DRG Definitions Manual / ICD-10-CM/PCS MS-DRG Definitions
**Structure:**
```json
{
  "fy2026": {
    "drg_criteria": {
      "870": {
        "principal_diagnosis_codes": ["A41.9", "A41.01", "A41.02", ...],
        "required_procedures": ["5A1955Z"],  // Mechanical ventilation >96 hrs
        "excluded_procedures": [],
        "mcc_codes": ["J18.9", "J96.01", ...],
        "cc_codes": ["J44.1", "N39.0", ...],
        "logic": "PDx in sepsis_codes AND procedure 5A1955Z present"
      },
      "871": {
        "principal_diagnosis_codes": ["A41.9", "A41.01", "A41.02", ...],
        "required_procedures": [],
        "excluded_procedures": ["5A1955Z"],
        "mcc_codes": ["J18.9", "J96.01", ...],
        "cc_codes": ["J44.1", "N39.0", ...],
        "logic": "PDx in sepsis_codes AND (MCC present) AND procedure 5A1955Z NOT present"
      }
    }
  }
}
```

### 4.3 ICD-10-CM/PCS Guidelines Index (Extended)
**Current:** `fy2026_guidelines_index.json` — needs DRG-relevant tagging
**Extension:** Add `drg_relevance` field to each guideline entry
```json
{
  "guideline_id": "I.C.1.d.1.a",
  "section": "Sepsis, Severe Sepsis, and Septic Shock",
  "title": "Sepsis with Localized Infection",
  "citation": "ICD-10-CM Official Guidelines FY2026, Section I.C.1.d.1.a",
  "associated_codes": ["A41.9", "R65.20", "R65.21"],
  "drg_relevance": ["870", "871", "872"],
  "summary_rationale": "When sepsis is present on admission and meets principal diagnosis criteria..."
}
```

### 4.4 AHA Coding Clinic Citation Index
**Source:** AHA Coding Clinic (metadata only — no copyrighted text)
**Structure:**
```json
{
  "fy2026": {
    "citations": [
      {
        "id": "CC-2024-Q1-12",
        "quarter": "Q1 2024",
        "page": 12,
        "topic": "Mechanical Ventilation Duration Coding",
        "related_drgs": ["870", "871"],
        "related_codes": ["5A1955Z", "5A1945Z", "5A1935Z"],
        "summary": "Ventilator hours calculated from intubation to extubation..."
      }
    ]
  }
}
```

---

## 5. Backend Implementation Plan

### 5.1 New Module: `backend/app/drg_optimizer.py`

```python
# Key Classes:
class DRGOptimizer:
    """Main orchestrator for DRG optimization analysis."""
    
    def __init__(
        self,
        grouper: BaseGrouperAdapter,
        pricer: AnubisMockPricer,
        guideline_index: FY2026GuidelineIndex,
        drg_kb: DRGKnowledgeBase
    ):
        ...

    async def analyze_optimization(
        self,
        case_data: GrouperRequest,
        current_drg: GrouperResponse,
        hospital_id: str
    ) -> OptimizationAnalysis:
        """Full optimization analysis pipeline."""
        ...


class DRGKnowledgeBase:
    """Loads and queries FY-specific DRG weights, criteria, and hierarchy."""
    
    def load_fy_data(self, fiscal_year: str) -> FYDRGData:
        ...
    
    def get_target_drg_candidates(
        self,
        current_drg: str,
        pdx: str,
        procedures: List[str],
        mcc_present: bool,
        cc_present: bool
    ) -> List[DRGCandidate]:
        """Enumerate reachable DRGs from current state."""
        ...


class DRGClinicalMapper:
    """Maps DRG criteria to clinical documentation requirements."""
    
    def map_requirements(self, target_drg: str, current_codes: List[str]) -> List[DocumentationGap]:
        ...


class QueryOpportunityScorer:
    """Scores and ranks query opportunities."""
    
    def score_opportunity(
        self,
        gap: DocumentationGap,
        reimbursement_delta: float,
        clinical_indicators: List[str]
    ) -> QueryOpportunity:
        ...
```

### 5.2 New Pydantic Schemas (extend `backend/app/schemas.py`)

```python
class DRGCandidate(BaseModel):
    drg_code: str
    drg_description: str
    relative_weight: float
    reimbursement_delta: float
    probability: Literal["HIGH", "MEDIUM", "LOW"]
    requirements: List[str]  # Clinical/procedural requirements
    query_recommendations: List[QueryRecommendation]


class QueryRecommendation(BaseModel):
    question: str
    clinical_indicators: List[str]  # Where to look in the record
    icd10_guideline_ref: Optional[str]
    coding_clinic_ref: Optional[str]
    compliance_risk: Literal["LOW", "MEDIUM", "HIGH"]


class DocumentationGap(BaseModel):
    category: str
    current_code: str
    gap: str
    action: str
    icd10_guideline_ref: Optional[str]
    coding_clinic_ref: Optional[str]
    potential_impact: str


class OptimizationAnalysis(BaseModel):
    optimization_potential: Literal["HIGH", "MEDIUM", "LOW", "NONE"]
    current_reimbursement: float
    target_drg_candidates: List[DRGCandidate]
    documentation_gaps: List[DocumentationGap]
    query_worthiness_score: float  # 0-10
    query_worthiness_rationale: str
    fiscal_year_context: FiscalYearContext


class FiscalYearContext(BaseModel):
    fiscal_year: str
    grouper_version: str
    effective_date: date
    guideline_version: str
```

### 5.3 API Endpoint (add to `backend/app/main.py`)

```python
@app.post("/api/optimize", response_model=OptimizationAnalysis)
async def optimize_drg(request: OptimizationRequest):
    """
    Analyze a claim for DRG optimization opportunities.
    
    Input: Current case data + current DRG result + hospital ID
    Output: Full optimization analysis with target DRGs, gaps, and query recommendations
    """
    ...
```

### 5.4 Fiscal Year Resolution Logic

```python
def resolve_fiscal_year(service_date: date) -> str:
    """CMS Fiscal Year: Oct 1 - Sep 30"""
    if service_date.month >= 10:
        return f"FY{service_date.year + 1}"
    return f"FY{service_date.year}"
```

---

## 6. Frontend Implementation Plan

### 6.1 New Component: `frontend/components/DRGOptimizerPanel.js`

**Location:** Right panel in Abstractor Sandbox (new tab: "Optimize")

**UI Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  DRG Optimizer                          [Tab: Optimize]    │
├─────────────────────────────────────────────────────────────┤
│  Current DRG: 871 — SEPTICEMIA W/O MV >96HR W MCC          │
│  Current Weight: 1.7824  |  Reimbursement: $13,368         │
├─────────────────────────────────────────────────────────────┤
│  🎯 OPTIMIZATION POTENTIAL: HIGH                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ TARGET DRG CANDIDATES                                   │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ ▶ 870 — SEPTICEMIA W/ MV >96HR          Δ +$12,456  │ │ │
│  │ │   Weight: 3.4521  |  Probability: MEDIUM            │ │ │
│  │ │   Requirements:                                     │ │ │
│  │ │   • Mechanical ventilation >96 hours (5A1955Z)     │ │ │
│  │ │   • Ventilator logs, RT notes, ICU flow sheets     │ │ │
│  │ │   [View Query Template]                             │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │   871 — SEPTICEMIA W/O MV >96HR W MCC     Δ $0      │ │ │
│  │ │   Weight: 1.7824  |  Probability: HIGH (CURRENT)    │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  📋 DOCUMENTATION GAPS                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ⚠ Sepsis Organism Specificity                          │ │
│  │   Current: A41.9 (Unspecified)                         │ │
│  │   Gap: Culture data may support specific organism code │ │
│  │   Action: Review microbiology reports                   │ │
│  │   Guideline: I.C.1.d.1.a  |  Coding Clinic: Q3 2023 p8 │ │
│  │   Impact: Same DRG, higher specificity for quality     │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ❓ QUERY WORTHINESS: 8.5/10                                │
│  "High reimbursement delta ($12K) with achievable          │
│  documentation requirement (vent hours). Moderate           │
│  probability based on ICU LOS of 5 days."                   │
├─────────────────────────────────────────────────────────────┤
│  📅 FY2026 Context: MS-DRG v43 | Guidelines FY2026         │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Integration with Existing UI
- Add "Optimize" tab to sandbox tab bar (next to Code Entry, References, Telemetry)
- Trigger analysis on ClaimSubmitted event or manual "Analyze" button
- Display results in new panel component
- Reuse existing design system (colors, spacing, typography)

---

## 7. Data Acquisition Strategy

### 7.1 CMS Public Domain Sources (No Licensing Required)
| Data | Source | Update Frequency |
|------|--------|------------------|
| MS-DRG Relative Weights | CMS.gov — "MS-DRG Classifications and Software" | Annual (Oct 1) |
| MS-DRG Definitions (logic) | CMS MS-DRG Definitions Manual | Annual |
| ICD-10-CM/PCS Code Files | CMS.gov — "ICD-10-CM/PCS Download" | Annual |
| ICD-10-CM Guidelines (text) | CMS.gov — "Official Guidelines" | Annual |

### 7.2 AHA Coding Clinic (Metadata Only)
- Maintain citation index (quarter, page, topic, related DRGs/codes)
- No copyrighted text stored
- Coders verify in their physical/electronic Coding Clinic subscriptions

### 7.3 MVP Scope: Curated Subset
- Load only DRGs relevant to current blueprint domains (~20-30 DRGs)
- Expand as blueprint library grows
- Version each FY dataset independently

---

## 8. Implementation Phases

### Phase 1: Core Engine (Week 1-2)
- [ ] `DRGKnowledgeBase` — load FY2026 DRG weights + criteria
- [ ] `DRGOptimizer` — neighborhood exploration + basic candidate generation
- [ ] `OptimizationAnalysis` schema + API endpoint `/api/optimize`
- [ ] Unit tests for DRG candidate enumeration logic

### Phase 2: Clinical Intelligence (Week 2-3)
- [ ] `DRGClinicalMapper` — gap analysis between current codes and target DRG requirements
- [ ] `QueryOpportunityScorer` — reimbursement delta + achievability scoring
- [ ] Extend `FY2026GuidelineIndex` with `drg_relevance` tagging
- [ ] Add Coding Clinic citation index (metadata only)

### Phase 3: Frontend (Week 3-4)
- [ ] `DRGOptimizerPanel.js` component
- [ ] Integrate with sandbox tab bar
- [ ] Connect to `/api/optimize` endpoint
- [ ] Display current DRG, candidates, gaps, query worthiness

### Phase 4: Polish & Integration (Week 4-5)
- [ ] End-to-end test with sepsis/pneumonia blueprint
- [ ] Validate reimbursement calculations match pricer
- [ ] Add fiscal year edge cases (Oct 1 boundary)
- [ ] Documentation & educator guide

---

## 9. Technical Considerations

### 9.1 Performance
- DRG candidate enumeration: O(n) where n = DRGs in MDC (typically <50)
- Guideline lookup: O(1) with indexed `guideline_index` by code
- Cache FY knowledge base in memory after first load

### 9.2 Accuracy & Compliance
- **Never auto-assign codes** — only suggest what to look for
- **Query templates** follow AHIMA/ACDIS compliant query guidelines
- **Probability scores** are estimates, not guarantees
- **Audit trail** — log all optimization analyses for compliance review

### 9.3 Extensibility
- Pluggable `DRGKnowledgeBase` for future commercial grouper adapters
- FY-specific data isolation — no cross-contamination
- Blueprint-aware — can prioritize DRGs relevant to current clinical domain

---

## 10. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Incorrect DRG logic | Validate against CMS MS-DRG Definitions Manual; unit test every DRG transition |
| Outdated guidelines | Annual data refresh pipeline; version lock per FY |
| Copyright infringement | Metadata-only approach; no guideline text or Coding Clinic text stored |
| Overpromising reimbursement | Clear "estimate" language; probability scoring; compliance risk flags |
| Query compliance | Templates reviewed by coding compliance officer; leading-query detection |

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| DRG candidate recall | 100% of reachable DRGs in MDC identified |
| Guideline citation relevance | >90% of gaps have at least one guideline reference |
| Query template compliance | 100% pass AHIMA/ACDIS leading-query review |
| Response time | <2 seconds for full optimization analysis |
| Coder adoption | >60% of sandbox sessions use Optimize tab |

---

## 12. Appendix: Example DRG Transitions (Sepsis Domain, FY2026)

| From DRG | To DRG | Trigger | Weight Delta | $ Delta (Urban Base $7,500) |
|----------|--------|---------|--------------|------------------------------|
| 872 (No CC/MCC) | 871 (W MCC) | Add MCC (e.g., J18.9, J96.01) | +0.7993 | +$5,995 |
| 871 (W MCC) | 870 (W MV>96) | Add 5A1955Z procedure | +1.6697 | +$12,523 |
| 871 (Sepsis PDx) | 193 (Pneumonia PDx w MCC) | Swap PDx to J18.9 + MCC | -0.4409 | -$3,307 |
| 871 | 871 (Same) | More specific sepsis code (A41.01) | 0 | $0 (quality only) |

---

**End of Design Document**

---

## Next Steps for Implementation

1. **Review & Approve** — Confirm design aligns with Anubis architecture and MVP scope
2. **Create Knowledge Base Files** — FY2026 DRG weights, criteria, guideline index extensions
3. **Implement Backend Engine** — `drg_optimizer.py` with core classes
4. **Add API Endpoint** — `/api/optimize` in `main.py`
5. **Build Frontend Panel** — `DRGOptimizerPanel.js` integrated into sandbox
6. **Test with Sepsis Blueprint** — Validate end-to-end with BP-SEPSIS-PNEUMONIA-001