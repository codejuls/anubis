from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
import os

from .schemas import GrouperRequest, GrouperResponse
from .grouper import AnubisMockGrouper
from .pricer import AnubisMockPricer
from .generator import SyntheticClaimsGenerator
from .llm_provider import OllamaProvider, OVMSProvider
from .nlp_parser import ClinicalNLPParser, NLPExtractionRequest, NLPExtractionResponse

# Initialize FastAPI application
app = FastAPI(
    title="Project Anubis Integration Core",
    description="Ecosystem endpoints for dynamic medical case grouping, pricing validation, synthetic claim generation, and NLP entity extraction.",
    version="0.2.0"
)

# Enable CORS for local sandbox development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate providers and engines
grouper = AnubisMockGrouper()
pricer = AnubisMockPricer()
ollama_llm = OllamaProvider()
nlp_parser = ClinicalNLPParser(llm_provider=ollama_llm)

# Path to default YAML blueprint
BLUEPRINT_PATH = os.path.join(os.path.dirname(__file__), "../../blueprints/sepsis_pneumonia.yaml")
generator = SyntheticClaimsGenerator(BLUEPRINT_PATH)

# Composite analysis structures
class AnalysisRequest(BaseModel):
    case_data: GrouperRequest
    hospital_id: Optional[str] = Field(default="DEFAULT", description="Hospital ID for pricing calculations")

class AnalysisResponse(BaseModel):
    grouper_result: GrouperResponse
    price_result: float = Field(..., description="Calculated reimbursement payment in USD ($)")
    hospital_id: str = Field(..., description="Hospital identifier used for pricing")


@app.get("/api/health")
async def health_check():
    """Simple health check endpoint."""
    return {
        "status": "healthy",
        "grouper_provider": grouper.provider_id,
        "pricer_provider": pricer.provider_id,
        "local_llm_provider": ollama_llm.provider_id
    }


@app.get("/api/generate")
async def generate_synthetic_case(seed: Optional[int] = None):
    """
    Synthetic Claims Generator (ASCG) Endpoint.
    Generates a brand-new, zero-PHI clinical chart and gold standard case package.
    """
    try:
        case_package = generator.generate_case(seed=seed)
        return case_package
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.post("/api/extract", response_model=NLPExtractionResponse)
async def extract_clinical_entity(request: NLPExtractionRequest):
    """
    Clinical Entity Extraction Endpoint (Milestone #2).
    Analyzes highlighted text excerpts and extracts ICD-10 suggestions, severity levels, and guideline citations.
    """
    try:
        response = await nlp_parser.parse_highlight(request.selected_text)
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"NLP extraction failed: {str(e)}")


@app.post("/api/group", response_model=GrouperResponse)
async def group_claim(request: GrouperRequest):
    """Direct endpoint for case grouping."""
    try:
        response = await grouper.group_case(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Grouping failed: {str(e)}")


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_claim(request: AnalysisRequest):
    """Composite analysis endpoint for both grouping and pricing."""
    try:
        # 1. Run the grouper
        group_res = await grouper.group_case(request.case_data)
        
        # 2. Run the pricer using the returned relative weight
        payment = await pricer.price_case(
            relative_weight=group_res.relative_weight,
            hospital_id=request.hospital_id,
            date_of_service=request.case_data.service_date
        )
        
        return AnalysisResponse(
            grouper_result=group_res,
            price_result=payment,
            hospital_id=request.hospital_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analysis failed: {str(e)}")


# Mount Frontend Static Files to serve the complete sandbox on a single port!
frontend_dir = "/opt/data/anubis/frontend"
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
