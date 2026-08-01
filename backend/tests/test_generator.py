import pytest
import os
from app.generator import SyntheticClaimsGenerator

def test_generator_creation_and_execution():
    bp_path = os.path.join(os.path.dirname(__file__), "../../blueprints/sepsis_pneumonia.yaml")
    generator = SyntheticClaimsGenerator(bp_path)
    
    # Generate case with seed for deterministic assertion
    case_pkg = generator.generate_case(seed=42)
    
    assert "case_id" in case_pkg
    assert case_pkg["blueprint_id"] == "BP-SEPSIS-PNEUMONIA-001"
    assert case_pkg["domain"] == "Inpatient-Internal-Medicine"
    assert case_pkg["metadata"]["patient"]["gender"] in ["M", "F"]
    
    narrative = case_pkg["unstructured_document"]["narrative"]
    assert "CHIEF COMPLAINT:" in narrative
    assert "LABORATORY & IMAGING FINDINGS:" in narrative
    
    gold = case_pkg["gold_standard"]
    assert gold["principal_diagnosis"]["code"] == "A41.9"
    assert len(gold["secondary_diagnoses"]) == 2
    assert gold["secondary_diagnoses"][0]["code"] == "J18.9"
