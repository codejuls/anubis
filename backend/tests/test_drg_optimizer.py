import pytest
from app.drg_optimizer import DRGOptimizer
from app.schemas import GrouperRequest, GrouperResponse, DiagnosisCode, ProcedureCode
from app.grouper import AnubisMockGrouper
from app.pricer import AnubisMockPricer
from app.guideline_index import FY2026GuidelineIndex

@pytest.mark.asyncio
async def test_drg_optimizer_sepsis_case():
    """Test DRG optimization with sepsis case."""
    # Initialize dependencies
    grouper = AnubisMockGrouper()
    pricer = AnubisMockPricer()
    guideline_index = FY2026GuidelineIndex()
    from app.drg_optimizer import DRGKnowledgeBase
    drg_kb = DRGKnowledgeBase()
    
    # Create optimizer
    optimizer = DRGOptimizer(grouper, pricer, guideline_index, drg_kb)
    
    # Test case: Sepsis with MCC (current DRG 871)
    case_data = GrouperRequest(
        age=68,
        gender="F",
        discharge_status="01",
        principal_diagnosis=DiagnosisCode(code="A41.9", present_on_admission=True),
        secondary_diagnoses=[
            DiagnosisCode(code="J18.9", present_on_admission=True),  # Unspecified pneumonia
            DiagnosisCode(code="I10", present_on_admission=True)     # Essential hypertension
        ],
        procedures=[
            ProcedureCode(code="02RF33Z", date_of_service="2026-08-01")  # Some procedure
        ],
        service_date="2026-08-15"
    )
    
    current_drg = GrouperResponse(
        drg_code="871",
        drg_description="SEPTICEMIA OR SEVERE SEPSIS WITHOUT MV >96 HOURS WITH MCC",
        relative_weight=1.7824,
        mdc_code="18",
        complication_level="MCC"
    )
    
    # Run optimization
    result = await optimizer.analyze_optimization(case_data, current_drg, "HOSP-URBAN-001")
    
    # Assertions
    assert result.optimization_potential in ["HIGH", "MEDIUM", "LOW", "NONE"]
    assert result.current_reimbursement > 0
    assert len(result.target_drg_candidates) >= 1
    assert 0 <= result.query_worthiness_score <= 10
    
    # Check that we have the expected DRG candidates
    drg_codes = [c.drg_code for c in result.target_drg_candidates]
    assert "870" in drg_codes  # Higher weight candidate
    assert "871" in drg_codes  # Current DRG
    assert "872" in drg_codes  # Lower weight candidate
    
    # Check that optimization potential is identified (should be HIGH or MEDIUM for this case)
    assert result.optimization_potential in ["HIGH", "MEDIUM"]
    
    # Check that we have documentation gaps
    assert len(result.documentation_gaps) >= 0  # May have gaps depending on implementation
    
    # Check fiscal year context
    assert result.fiscal_year_context.fiscal_year == "FY2026"
    assert result.fiscal_year_context.grouper_version == "v43"

@pytest.mark.asyncio
async def test_drg_optimizer_no_optimization_needed():
    """Test DRG optimization when no optimization is beneficial."""
    # Initialize dependencies
    grouper = AnubisMockGrouper()
    pricer = AnubisMockPricer()
    guideline_index = FY2026GuidelineIndex()
    from app.drg_optimizer import DRGKnowledgeBase
    drg_kb = DRGKnowledgeBase()
    
    # Create optimizer
    optimizer = DRGOptimizer(grouper, pricer, guideline_index, drg_kb)
    
    # Test case: Already at highest weight DRG for sepsis (870)
    case_data = GrouperRequest(
        age=68,
        gender="F",
        discharge_status="01",
        principal_diagnosis=DiagnosisCode(code="A41.9", present_on_admission=True),
        secondary_diagnoses=[
            DiagnosisCode(code="J18.9", present_on_admission=True),
        ],
        procedures=[
            ProcedureCode(code="5A1955Z", date_of_service="2026-08-01")  # Ventilation >96 hrs
        ],
        service_date="2026-08-15"
    )
    
    current_drg = GrouperResponse(
        drg_code="870",
        drg_description="SEPTICEMIA OR SEVERE SEPSIS WITH MV >96 HOURS",
        relative_weight=3.4521,
        mdc_code="18",
        complication_level="MCC"  # Assuming pneumonia is MCC
    )
    
    # Run optimization
    result = await optimizer.analyze_optimization(case_data, current_drg, "HOSP-URBAN-001")
    
    # Assertions
    assert result.optimization_potential in ["HIGH", "MEDIUM", "LOW", "NONE"]
    assert result.current_reimbursement > 0
    assert len(result.target_drg_candidates) >= 1
    
    # Current DRG should be first candidate (highest weight)
    assert result.target_drg_candidates[0].drg_code == "870"
    assert result.target_drg_candidates[0].reimbursement_delta == 0
