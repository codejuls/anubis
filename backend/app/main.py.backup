from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, List
import os
import re

from .schemas import GrouperRequest, GrouperResponse
from .grouper import AnubisMockGrouper
from .pricer import AnubisMockPricer
from .generator import SyntheticClaimsGenerator
from .llm_provider import OllamaProvider, OVMSProvider
from .nlp_parser import ClinicalNLPParser, NLPExtractionRequest, NLPExtractionResponse
from .forge import ScenarioForgeEngine, BlueprintSummary, ForgeCustomizationRequest, ForgeScenarioPackage
from .schemas import GrouperRequest, GrouperResponse, OptimizationRequest, OptimizationAnalysis
from .drg_optimizer import DRGOptimizer, DRGKnowledgeBase
from .guideline_index import FY2026GuidelineIndex

# Blueprint Creator models
class BlueprintSaveRequest(BaseModel):
    blueprint_id: str = Field(..., description="Unique blueprint identifier (e.g., BP-DOMAIN-CONCEPT-###)")
    yaml_content: str = Field(..., description="Full YAML content of the blueprint")

class BlueprintSaveResponse(BaseModel):
    success: bool
    blueprint_id: str
    message: str

# Initialize FastAPI application
app = FastAPI(
    title="Project Anubis Integration Core",
    description="Ecosystem endpoints for dynamic medical case grouping, pricing validation, synthetic claim generation, and Scenario Forge Studio.",
    version="0.3.0"
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
forge_engine = ScenarioForgeEngine()

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


# --- SCENARIO FORGE STUDIO ENDPOINTS ---

@app.get("/api/forge/blueprints", response_model=List[BlueprintSummary])
async def list_forge_blueprints():
    """Returns a list of all available parent blueprints in the Scenario Forge."""
    try:
        return forge_engine.list_blueprints()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list blueprints: {str(e)}")


@app.post("/api/forge/synthesize", response_model=ForgeScenarioPackage)
async def synthesize_forge_scenario(request: ForgeCustomizationRequest):
    """
    Synthesizes a customized scenario package based on educator controls
    (age ranges, noise levels, and mutation vectors).
    """
    try:
        return forge_engine.forge_scenario(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Forge synthesis failed: {str(e)}")


@app.post("/api/forge/blueprints/save", response_model=BlueprintSaveResponse)
async def save_blueprint(request: BlueprintSaveRequest):
    """
    Saves a new blueprint YAML file to the blueprints directory.
    Validates the YAML structure and blueprint_id uniqueness.
    """
    try:
        import yaml
        import os
        
        blueprints_dir = os.path.join(os.path.dirname(__file__), "../../blueprints")
        os.makedirs(blueprints_dir, exist_ok=True)
        
        # Validate YAML is parseable
        try:
            parsed = yaml.safe_load(request.yaml_content)
        except yaml.YAMLError as e:
            raise HTTPException(status_code=400, detail=f"Invalid YAML: {str(e)}")
        
        # Validate required fields
        required_fields = ["blueprint_id", "domain", "core_concept", "difficulty_level", 
                          "demographics_rules", "isomorphic_noise_pool", "clinical_template", "gold_standard"]
        for field in required_fields:
            if field not in parsed:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Validate blueprint_id matches
        if parsed.get("blueprint_id") != request.blueprint_id:
            raise HTTPException(status_code=400, detail="blueprint_id in YAML does not match request")
        
        # Check for existing
        file_path = os.path.join(blueprints_dir, f"{request.blueprint_id}.yaml")
        if os.path.exists(file_path):
            raise HTTPException(status_code=409, detail=f"Blueprint '{request.blueprint_id}' already exists. Use a different ID.")
        
        # Write file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(request.yaml_content)
        
        # Reload the forge engine to pick up the new blueprint
        forge_engine._load_all_blueprints()
        
        return BlueprintSaveResponse(
            success=True,
            blueprint_id=request.blueprint_id,
            message=f"Blueprint saved to {file_path}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")


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
    Clinical Entity Extraction Endpoint.
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
        hospital_id = request.hospital_id or "DEFAULT"
        # 1. Run the grouper
        group_res = await grouper.group_case(request.case_data)
        
        # 2. Run the pricer using the returned relative weight
        payment = await pricer.price_case(
            relative_weight=group_res.relative_weight,
            hospital_id=hospital_id,
            date_of_service=request.case_data.service_date
        )
        
        return AnalysisResponse(
            grouper_result=group_res,
            price_result=payment,
            hospital_id=hospital_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analysis failed: {str(e)}")




# DRG Optimizer Endpoint
@ app.post("/api/optimize", response_model=OptimizationAnalysis)
async def optimize_drg(request: OptimizationRequest):
    """
    Analyze a claim for DRG optimization opportunities.
    
    Input: Current case data + current DRG result + hospital ID
    Output: Full optimization analysis with target DRGs, gaps, and query recommendations
    """
    try:
        # Initialize the DRG optimizer with dependencies
        guideline_index = FY2026GuidelineIndex()
        drg_kb = DRGKnowledgeBase()
        
        optimizer = DRGOptimizer(
            grouper=grouper,
            pricer=pricer,
            guideline_index=guideline_index,
            drg_kb=drg_kb
        )
        
        # Run the optimization analysis
        hospital_id = request.hospital_id or "DEFAULT"
        analysis = await optimizer.analyze_optimization(
            case_data=request.case_data,
            current_drg=request.current_drg,
            hospital_id=hospital_id
        )
        
        return analysis
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DRG optimization failed: {str(e)}")


from .medical_code_graph.graph import MedicalCodeGraph
import json
from pathlib import Path

_graph_instance = None

def get_graph():
    global _graph_instance
    if _graph_instance is None:
        _graph_instance = MedicalCodeGraph(data_dir="/opt/data/anubis/knowledge")
        try:
            _graph_instance.load()
        except FileNotFoundError as e:
            _graph_instance = e
    elif isinstance(_graph_instance, Exception):
        raise _graph_instance
    return _graph_instance

# Helper to extract codes from text (ICD-10-CM/PCS, CPT, HCPCS pattern)
_CODE_RE = re.compile(r"\b[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?\b")

def extract_codes(text: str) -> list:
    return sorted(set(_CODE_RE.findall(text.upper())))

@app.post("/api/graph/tip")
async def graph_tip(payload: dict):
    """
    Expected JSON:
    {
        "question": "What is the impact of adding a sepsis code to a COPD claim?",
        "use_llm": true   # optional, defaults to true
    }
    Returns:
    {
        "tip": "..." ,
        "codes": ["J44.9", "A41.9"],
        "context": "..."
    }
    """
    question = payload.get("question", "")
    use_llm = bool(payload.get("use_llm", True))
    if not question:
        raise HTTPException(status_code=400, detail="Missing 'question' field")

    try:
        g = get_graph()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Graph data not found: {e}")

    codes = extract_codes(question)
    if not codes:
        # Fallback: treat the whole question as a space/comma separated list of potential codes
        parts = [p.strip().upper() for p in question.replace(",", " ").split() if p]
        codes = [p for p in parts if _CODE_RE.fullmatch(p)]
    if not codes:
        raise HTTPException(status_code=400, detail="No valid medical codes found in the input.")

    # Build context using the graph
    facts = []
    for code in codes:
        for edge in g.outgoing.get(code, []):
            if edge["type"] == "code_guideline":
                gl_node = g.get_node(edge["target"])
                gl_label = gl_node.get("label") if gl_node else edge["target"]
                facts.append(f"- Code {code} is associated with guideline '{gl_label}'.")

    mdcs = set()
    drgs = set()
    for code in codes:
        for e1 in g.outgoing.get(code, []):
            if e1["type"] != "code_guideline":
                continue
            guideline_id = e1["target"]
            for e2 in g.outgoing.get(guideline_id, []):
                if e2["type"] != "guideline_mdc":
                    continue
                mdc_id = e2["target"]
                mdcs.add(mdc_id)
                for e3 in g.incoming.get(mdc_id, []):
                    if e3["type"] == "drg_mdc":
                        drgs.add(e3["source"])

    if mdcs:
        facts.append(f"- The involved MDC(s) are: {', '.join(sorted(mdcs))}.")
    if drgs:
        facts.append(f"- Possible DRG(s) for the given code(s): {', '.join(sorted(drgs))}.")

    # Add known heuristics (could be made configurable)
    facts.append("- Sepsis (A41.9) is always an MCC, which can increase DRG weight.")
    facts.append("- If prolonged ventilation (>96h) is present, consider procedure code 5A1945Z, which may shift the DRG to a higher weight.")

    context = "\n".join(facts)

    if not use_llm or ollama_llm is None:
        # Fallback to graph-generated tip
        tip = g.generate_tip_for_codes(codes)
        return {"tip": tip, "codes": codes, "context": context}

    # Use the LLM to generate a natural language answer
    try:
        llm_response = await ollama_llm.generate_text(
            system_prompt="You are a medical coding expert. Use the following knowledge‑graph facts to answer the question.",
            user_prompt=f"{context}\\n\
Question: {question}\\nAnswer in plain language, suitable for a coder's quick reference.",
            max_tokens=512
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {exc}")

    return {"tip": llm_response.strip(), "codes": codes, "context": context}
# Mount Frontend Static Files to serve the complete sandbox on a single port!
frontend_dir = "/opt/data/anubis/frontend"
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
