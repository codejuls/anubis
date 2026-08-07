from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import date
from enum import Enum

class DiagnosisCode(BaseModel):
    code: str = Field(..., description="ICD-10-CM diagnosis code (e.g., 'A41.9')")
    present_on_admission: bool = Field(default=True, description="Present on Admission (POA) indicator flag")

class ProcedureCode(BaseModel):
    code: str = Field(..., description="ICD-10-PCS or CPT procedure code (e.g., '0DB64ZX')")
    date_of_service: Optional[date] = Field(None, description="Date procedure was performed")
    modifiers: List[str] = Field(default_factory=list, description="CPT modifier strings")

class GrouperRequest(BaseModel):
    age: int = Field(..., ge=0, le=125, description="Patient age at admission")
    gender: str = Field(..., pattern="^[MFU]$", description="Biological sex (M/F/U)")
    discharge_status: str = Field(..., description="Two-digit CMS discharge status code (e.g., '01')")
    principal_diagnosis: DiagnosisCode = Field(..., description="The main diagnosis code")
    secondary_diagnoses: List[DiagnosisCode] = Field(default_factory=list, description="Secondary diagnoses")
    procedures: List[ProcedureCode] = Field(default_factory=list, description="Surgical or medical procedures")
    service_date: date = Field(..., description="Date of service, used to determine fiscal year rule sets")

class GrouperResponse(BaseModel):
    drg_code: str = Field(..., description="Three-digit MS-DRG or APR-DRG code (e.g., '871')")
    drg_description: str = Field(..., description="Official DRG clinical descriptor")
    relative_weight: float = Field(..., description="Reimbursement multiplier weight")
    mdc_code: str = Field(..., description="Major Diagnostic Category (e.g., '18')")
    complication_level: str = Field(..., description="CC/MCC status level (None, CC, or MCC)")
    raw_response: dict = Field(default_factory=dict, description="Escaped vendor-specific response for advanced debugging")

# New models for DRG Optimizer

class OptimizationRequest(BaseModel):
    case_data: GrouperRequest
    current_drg: GrouperResponse
    hospital_id: Optional[str] = Field(default="HOSP-URBAN-001", description="Hospital ID for pricing calculations")

class OptimizationAnalysis(BaseModel):
    optimization_potential: Literal["HIGH", "MEDIUM", "LOW", "NONE"]
    current_reimbursement: float
    target_drg_candidates: List["DRGCandidate"]
    documentation_gaps: List["DocumentationGap"]
    query_worthiness_score: float  # 0-10
    query_worthiness_rationale: str
    fiscal_year_context: "FiscalYearContext"

class DRGCandidate(BaseModel):
    drg_code: str
    drg_description: str
    relative_weight: float
    reimbursement_delta: float
    probability: Literal["HIGH", "MEDIUM", "LOW"]
    requirements: List[str]  # Clinical/procedural requirements
    query_recommendations: List["QueryRecommendation"]

class QueryRecommendation(BaseModel):
    question: str
    clinical_indicators: List[str]  # Where to look in the record
    icd10_guideline_ref: Optional[str] = None
    coding_clinic_ref: Optional[str] = None
    compliance_risk: Literal["LOW", "MEDIUM", "HIGH"]

class DocumentationGap(BaseModel):
    category: str
    current_code: str
    gap: str
    action: str
    icd10_guideline_ref: Optional[str] = None
    coding_clinic_ref: Optional[str] = None
    potential_impact: str

class FiscalYearContext(BaseModel):
    fiscal_year: str
    grouper_version: str
    effective_date: date
    guideline_version: str
