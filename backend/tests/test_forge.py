import pytest
from app.forge import ScenarioForgeEngine, ForgeCustomizationRequest

def test_list_blueprints():
    forge = ScenarioForgeEngine()
    summaries = forge.list_blueprints()
    assert len(summaries) > 0
    assert summaries[0].blueprint_id == "BP-SEPSIS-PNEUMONIA-001"
    assert "MUT-POA-SHIFT" in summaries[0].available_mutations[0]

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
