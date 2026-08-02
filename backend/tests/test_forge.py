import pytest
from app.forge import ScenarioForgeEngine, ForgeCustomizationRequest

def test_list_blueprints():
    forge = ScenarioForgeEngine()
    summaries = forge.list_blueprints()
    assert len(summaries) > 0
    # Find the original sepsis blueprint (order not guaranteed)
    sepsis_bp = next((s for s in summaries if s.blueprint_id == "BP-SEPSIS-PNEUMONIA-001"), None)
    assert sepsis_bp is not None, "Original sepsis blueprint should be present"
    assert "MUT-POA-SHIFT" in sepsis_bp.available_mutations[0]
    # Verify new blueprints are loaded
    bp_ids = {s.blueprint_id for s in summaries}
    assert "BP-COPD-EXACERBATION-002" in bp_ids
    assert "BP-HEART-FAILURE-ACUTE-003" in bp_ids
    assert "BP-AMI-NSTEMI-004" in bp_ids
    assert "BP-STROKE-ISCHEMIC-005" in bp_ids
    assert "BP-PNEUMONIA-ASPIRATION-006" in bp_ids
    assert "BP-HIP-FRACTURE-ORIF-007" in bp_ids

def test_forge_scenario_basic():
    forge = ScenarioForgeEngine()
    req = ForgeCustomizationRequest(
        blueprint_id="BP-SEPSIS-PNEUMONIA-001",
        age_range=[60, 75],
        noise_density="Medium",
        apply_poa_mutation=False,
        seed=101
    )
    pkg = forge.forge_scenario(req)
    assert pkg.blueprint_id == "BP-SEPSIS-PNEUMONIA-001"
    assert "FORGE-" in pkg.scenario_id
    assert pkg.gold_standard["principal_diagnosis"]["code"] == "A41.9"

def test_forge_scenario_poa_mutation():
    forge = ScenarioForgeEngine()
    req = ForgeCustomizationRequest(
        blueprint_id="BP-SEPSIS-PNEUMONIA-001",
        apply_poa_mutation=True,
        seed=202
    )
    pkg = forge.forge_scenario(req)
    # With POA mutation applied, principal diagnosis becomes Pneumonia J18.9
    assert pkg.gold_standard["principal_diagnosis"]["code"] == "J18.9"
    assert pkg.gold_standard["secondary_diagnoses"][0]["code"] == "A41.9"
