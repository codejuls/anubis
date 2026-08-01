import re
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from .llm_provider import OllamaProvider

class NLPExtractionRequest(BaseModel):
    selected_text: str = Field(..., description="The highlighted clinical narrative excerpt")

class NLPExtractionResponse(BaseModel):
    entity_text: str = Field(..., description="Raw selected clinical text")
    suggested_code: str = Field(..., description="Suggested ICD-10-CM or CPT code")
    description: str = Field(..., description="Official code descriptor")
    severity_type: str = Field(..., description="Clinical classification (Principal Candidate, MCC, CC, Indicator)")
    official_citation: str = Field(..., description="AHA Coding Clinic or Official Guideline Citation")
    rationale: str = Field(..., description="Educational rationale for clinical abstraction")
    source: str = Field(default="Deterministic Rule Engine", description="Extraction engine source")


class ClinicalNLPParser:
    """
    Anubis Clinical NLP Parser Engine.
    Processes highlighted chart excerpts using fast rule matching and falls back to 
    local Ollama sidecar (qwen2.5-coder:7b) for complex unstructured text.
    """

    def __init__(self, llm_provider: Optional[OllamaProvider] = None):
        self.llm_provider = llm_provider or OllamaProvider()

        # Clinical term rule dictionary for MVP domains
        self.RULES = [
            {
                "patterns": [r"sepsis", r"septic", r"lactate.*2\.", r"lactate.*3\."],
                "code": "A41.9",
                "desc": "Sepsis, unspecified organism",
                "severity": "Principal Candidate",
                "citation": "AHA Coding Clinic for ICD-10-CM, Q4 2023, p. 8",
                "rationale": "Systemic inflammatory response to infection present on admission. Sequence as principal diagnosis under Guideline I.C.1.d.1.a."
            },
            {
                "patterns": [r"pneumonia", r"infiltrate", r"consolidation", r"cough.*fever"],
                "code": "J18.9",
                "desc": "Pneumonia, unspecified organism",
                "severity": "MCC",
                "citation": "ICD-10-CM Official Guidelines for Coding and Reporting, FY2026",
                "rationale": "Localized pulmonary infection causing systemic sepsis. Classified as Major Complication or Comorbidity (MCC)."
            },
            {
                "patterns": [r"copd", r"dyspnea", r"respiratory distress", r"wheezing"],
                "code": "J44.1",
                "desc": "Chronic obstructive pulmonary disease with (acute) exacerbation",
                "severity": "CC",
                "citation": "AHA Coding Clinic for ICD-10-CM, Q3 2021, p. 12",
                "rationale": "Acute exacerbation of underlying airway disease managed with bronchodilators and oxygen therapy. Classified as CC."
            },
            {
                "patterns": [r"wbc.*14", r"wbc.*15", r"wbc.*16", r"temp.*102", r"fever"],
                "code": "R50.9",
                "desc": "Fever, unspecified / Inflammatory Indicator",
                "severity": "Indicator",
                "citation": "ICD-10-CM Guidelines Section I.B.18",
                "rationale": "Clinical lab/vital indicator supporting systemic infection/sepsis diagnosis."
            }
        ]

    async def parse_highlight(self, selected_text: str) -> NLPExtractionResponse:
        clean_text = selected_text.strip()
        lower_text = clean_text.lower()

        # 1. Fast Deterministic Pattern Matching
        for rule in self.RULES:
            for pattern in rule["patterns"]:
                if re.search(pattern, lower_text):
                    return NLPExtractionResponse(
                        entity_text=clean_text,
                        suggested_code=rule["code"],
                        description=rule["desc"],
                        severity_type=rule["severity"],
                        official_citation=rule["citation"],
                        rationale=rule["rationale"],
                        source="Anubis Rule Matching Engine"
                    )

        # 2. Fallback to Local Ollama Sidecar Model
        try:
            sys_prompt = (
                "You are an expert medical coder and Clinical Documentation Improvement (CDI) specialist. "
                "Analyze the highlighted clinical text and identify the single most appropriate ICD-10-CM code. "
                "Return output in exact format: CODE | DESCRIPTION | RATIONALE"
            )
            user_prompt = f"Analyze clinical excerpt: '{clean_text}'"
            
            llm_res = await self.llm_provider.generate_text(sys_prompt, user_prompt, max_tokens=100)
            
            parts = [p.strip() for p in llm_res.split("|")]
            suggested_code = parts[0] if len(parts) > 0 else "R69"
            desc = parts[1] if len(parts) > 1 else "Illness, unspecified"
            rationale = parts[2] if len(parts) > 2 else "Inferred via local Qwen2.5-Coder model."

            return NLPExtractionResponse(
                entity_text=clean_text,
                suggested_code=suggested_code,
                description=desc,
                severity_type="Indicator",
                official_citation="Anubis Local AI Inference",
                rationale=rationale,
                source=f"Local LLM ({self.llm_provider.model_name})"
            )
        except Exception:
            # Safe default if LLM is unavailable
            return NLPExtractionResponse(
                entity_text=clean_text,
                suggested_code="R69",
                description="Unspecified illness / clinical observation",
                severity_type="Indicator",
                official_citation="ICD-10-CM Guidelines",
                rationale="Unmapped clinical indicator.",
                source="Fallback Parser"
            )
