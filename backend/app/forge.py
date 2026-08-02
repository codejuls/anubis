import os
import yaml
import copy
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from .generator import SyntheticClaimsGenerator

class BlueprintSummary(BaseModel):
    blueprint_id: str
    domain: str
    core_concept: str
    difficulty_level: str
    age_range: List[int]
    available_mutations: List[str]

class ForgeCustomizationRequest(BaseModel):
    blueprint_id: str
    age_range: Optional[List[int]] = Field(None, description="Custom age range [min, max]")
    noise_density: Optional[str] = Field("Medium", description="Noise density: Low, Medium, High")
    apply_poa_mutation: Optional[bool] = Field(False, description="Shift onset from POA to post-admission")
    seed: Optional[int] = Field(None, description="Random seed for deterministic generation")

class ForgeScenarioPackage(BaseModel):
    scenario_id: str
    blueprint_id: str
    domain: str
    customization: Dict[str, Any]
    synthesized_ehr: Dict[str, Any]
    gold_standard: Dict[str, Any]


class ScenarioForgeEngine:
    """
    Anubis Scenario Forge Engine.
    Manages blueprints, applies educator customization parameters, and synthesizes 
    isomorphic and mutative medical scenarios on demand.
    """

    def __init__(self, blueprints_dir: Optional[str] = None):
        default_dir = os.path.join(os.path.dirname(__file__), "../../blueprints")
        self.blueprints_dir = blueprints_dir or default_dir
        self.blueprints: Dict[str, Dict[str, Any]] = {}
        self._load_all_blueprints()

    def _load_all_blueprints(self):
        """Loads all available YAML blueprints from the blueprints directory."""
        if not os.path.exists(self.blueprints_dir):
            os.makedirs(self.blueprints_dir, exist_ok=True)
            return

        for fname in os.listdir(self.blueprints_dir):
            if fname.endswith(".yaml") or fname.endswith(".yml"):
                fpath = os.path.join(self.blueprints_dir, fname)
                try:
                    with open(fpath, 'r', encoding='utf-8') as f:
                        data = yaml.safe_load(f)
                        if data and "blueprint_id" in data:
                            self.blueprints[data["blueprint_id"]] = data
                except Exception as e:
                    print(f"Failed to load blueprint {fname}: {e}")

    def list_blueprints(self) -> List[BlueprintSummary]:
        """Returns a list of all available parent blueprints."""
        summaries = []
        for b_id, bp in self.blueprints.items():
            mutations = ["MUT-POA-SHIFT (Post-Admission Onset Shift)", "MUT-ACUITY-NOISE (Chronic Condition Injection)"]
            summaries.append(
                BlueprintSummary(
                    blueprint_id=b_id,
                    domain=bp.get("domain", "General Medicine"),
                    core_concept=bp.get("core_concept", "Unspecified"),
                    difficulty_level=bp.get("difficulty_level", "Moderate"),
                    age_range=bp.get("demographics_rules", {}).get("age_range", [18, 90]),
                    available_mutations=mutations
                )
            )
        return summaries

    def forge_scenario(self, request: ForgeCustomizationRequest) -> ForgeScenarioPackage:
        """Applies educator customizations to a blueprint and generates a synthesized scenario package."""
        bp = self.blueprints.get(request.blueprint_id)
        if not bp:
            raise ValueError(f"Blueprint '{request.blueprint_id}' not found.")

        # Create a deep copy of blueprint to apply mutations safely
        custom_bp = copy.deepcopy(bp)

        # 1. Apply age range customization
        if request.age_range and len(request.age_range) == 2:
            custom_bp["demographics_rules"]["age_range"] = request.age_range

        # 2. Apply POA Mutation (Mutative Variant)
        gold_standard = copy.deepcopy(custom_bp["gold_standard"])
        if request.apply_poa_mutation:
            # Swap Principal Diagnosis: Sepsis (A41.9) becomes secondary, Pneumonia (J18.9) becomes principal
            old_pdx = gold_standard["principal_diagnosis"]
            new_pdx = {
                "code": "J18.9",
                "description": "Pneumonia, unspecified organism",
                "rationale": "Sepsis onset occurred post-admission. Pneumonia meets principal diagnosis criteria."
            }
            new_sdx = [
                {
                    "code": "A41.9",
                    "description": "Sepsis, unspecified organism",
                    "type": "MCC",
                    "rationale": "Post-admission complication. Sequence as secondary MCC."
                }
            ]
            gold_standard["principal_diagnosis"] = new_pdx
            gold_standard["secondary_diagnoses"] = new_sdx

        # Write temp blueprint file for generator
        temp_bp_path = os.path.join(self.blueprints_dir, f"temp_{request.blueprint_id}.yaml")
        with open(temp_bp_path, 'w', encoding='utf-8') as f:
            yaml.dump(custom_bp, f)

        try:
            generator = SyntheticClaimsGenerator(temp_bp_path)
            case_pkg = generator.generate_case(seed=request.seed)
            case_pkg["gold_standard"] = gold_standard  # Override with mutated gold standard if applicable

            scenario_pkg = ForgeScenarioPackage(
                scenario_id=f"FORGE-{case_pkg['case_id']}",
                blueprint_id=request.blueprint_id,
                domain=custom_bp.get("domain", "General Medicine"),
                customization={
                    "age_range": custom_bp["demographics_rules"]["age_range"],
                    "noise_density": request.noise_density,
                    "poa_mutation_applied": request.apply_poa_mutation
                },
                synthesized_ehr=case_pkg["unstructured_document"],
                gold_standard=gold_standard
            )
            return scenario_pkg
        finally:
            if os.path.exists(temp_bp_path):
                os.remove(temp_bp_path)
