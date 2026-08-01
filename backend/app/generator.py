import yaml
import random
import os
from typing import Dict, Any, Optional
from datetime import date

class SyntheticClaimsGenerator:
    """
    Anubis Synthetic Claims Generator (ASCG Core)
    Consumes YAML case blueprints and generates structured, realistic, zero-PHI clinical scenarios.
    """

    def __init__(self, blueprint_path: str):
        if not os.path.exists(blueprint_path):
            raise FileNotFoundError(f"Blueprint file not found at {blueprint_path}")
        
        with open(blueprint_path, 'r', encoding='utf-8') as f:
            self.blueprint = yaml.safe_load(f)

    def generate_case(self, seed: Optional[int] = None) -> Dict[str, Any]:
        """
        Generates a complete, structured case package containing both the 
        unstructured EHR narrative and the Gold Standard claims solution.
        """
        if seed is not None:
            random.seed(seed)

        bp = self.blueprint

        # 1. Sample Demographics
        age_min, age_max = bp["demographics_rules"]["age_range"]
        patient_age = random.randint(age_min, age_max)
        patient_gender = random.choice(bp["demographics_rules"]["genders"])
        gender_title = "female" if patient_gender == "F" else "male"
        gender_pronoun = "She" if patient_gender == "F" else "He"
        gender_possessive = "Her" if patient_gender == "F" else "His"

        # 2. Sample Vitals & Labs from Blueprint Ranges
        vitals = bp["clinical_template"]["vitals"]
        temp = round(random.uniform(vitals["temp_fahrenheit"][0], vitals["temp_fahrenheit"][1]), 1)
        hr = random.randint(vitals["heart_rate_bpm"][0], vitals["heart_rate_bpm"][1])
        rr = random.randint(vitals["respiratory_rate"][0], vitals["respiratory_rate"][1])
        bp_sys = random.randint(vitals["blood_pressure_sys"][0], vitals["blood_pressure_sys"][1])
        bp_dia = random.randint(vitals["blood_pressure_dia"][0], vitals["blood_pressure_dia"][1])

        labs = bp["clinical_template"]["labs"]
        wbc = round(random.uniform(labs["wbc_k_uL"][0], labs["wbc_k_uL"][1]), 1)
        lactate = round(random.uniform(labs["lactate_mmol_L"][0], labs["lactate_mmol_L"][1]), 1)

        # 3. Sample Isomorphic Noise (Social History & Chronic Conditions)
        social_noise = random.choice(bp["isomorphic_noise_pool"]["social_history"])
        chronic_conditions_sample = random.sample(
            bp["isomorphic_noise_pool"]["chronic_conditions"],
            k=min(2, len(bp["isomorphic_noise_pool"]["chronic_conditions"]))
        )

        chronic_markers = " ".join([c["clinical_marker"] for c in chronic_conditions_sample])

        # 4. Synthesize Unstructured Clinical EHR Narrative
        chief_complaint = bp["clinical_template"]["chief_complaint"]
        
        narrative = (
            f"CHIEF COMPLAINT: {chief_complaint}\n\n"
            f"HISTORY OF PRESENT ILLNESS: The patient is a {patient_age}-year-old {gender_title} "
            f"who presents with progressive dyspnea, fever, and generalized fatigue. "
            f"Social History: {social_noise} "
            f"Past Medical History: {chronic_markers}\n\n"
            f"PHYSICAL EXAMINATION & VITALS: Admitting Vitals: Temperature {temp}°F, "
            f"Heart Rate {hr} bpm, Respiratory Rate {rr} bpm, Blood Pressure {bp_sys}/{bp_dia} mmHg. "
            f"{gender_pronoun} appears in moderate respiratory distress with bilateral lung crackles.\n\n"
            f"LABORATORY & IMAGING FINDINGS: Initial serum Lactate is elevated at {lactate} mmol/L. "
            f"White Blood Cell (WBC) count is elevated at {wbc} K/uL. "
            f"Chest X-Ray demonstrates: {labs['chest_xray']}\n\n"
            f"ASSESSMENT & HOSPITAL COURSE: Severe sepsis secondary to community-acquired pneumonia. "
            f"{gender_pronoun} was placed on sepsis resuscitation protocol with IV fluid boluses and started on "
            f"broad-spectrum IV antibiotics (Ceftriaxone and Azithromycin). Supplemental oxygen titrated via nasal cannula. "
            f"{gender_possessive} chronic conditions were monitored and maintained on home medications."
        )

        # 5. Compile Package
        case_id = f"ANUBIS-{bp['blueprint_id']}-{random.randint(1000, 9999)}"
        
        return {
            "case_id": case_id,
            "blueprint_id": bp["blueprint_id"],
            "domain": bp["domain"],
            "difficulty_level": bp["difficulty_level"],
            "metadata": {
                "generated_at": date.today().isoformat(),
                "patient": {
                    "age": patient_age,
                    "gender": patient_gender,
                    "discharge_status": "01"
                }
            },
            "unstructured_document": {
                "document_type": "Discharge Summary",
                "narrative": narrative
            },
            "gold_standard": bp["gold_standard"]
        }


# Quick CLI execution check if run directly
if __name__ == "__main__":
    bp_file = os.path.join(os.path.dirname(__file__), "../../blueprints/sepsis_pneumonia.yaml")
    generator = SyntheticClaimsGenerator(bp_file)
    package = generator.generate_case(seed=42)
    import json
    print(json.dumps(package, indent=2))
