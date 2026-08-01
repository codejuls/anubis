from abc import ABC, abstractmethod
from datetime import date
from typing import Set
from .schemas import GrouperRequest, GrouperResponse

# 1. Abstract Base Class for "Bring Your Own Grouper" (BYOG)
class BaseGrouperAdapter(ABC):
    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Returns the unique identifier of the grouper provider."""
        pass

    @abstractmethod
    async def group_case(self, request: GrouperRequest) -> GrouperResponse:
        """Takes standard clinical inputs and maps them to a unified DRG response."""
        pass


# 2. Our "Little" Mock Rules Engine / Inpatient Grouper
class AnubisMockGrouper(BaseGrouperAdapter):
    @property
    def provider_id(self) -> str:
        return "anubis-internal-mock"

    # Define simple subsets for MCC and CC codes for our MVP domains
    MCC_CODES: Set[str] = {
        "J18.9",    # Pneumonia, unspecified organism (when secondary)
        "J96.01",   # Acute respiratory failure with hypoxia
        "A41.9"     # Sepsis (when secondary)
    }

    CC_CODES: Set[str] = {
        "J44.1",    # COPD with (acute) exacerbation (when secondary)
        "N39.0",    # Urinary tract infection, site not specified
        "I50.9"     # Heart failure, unspecified
    }

    async def group_case(self, request: GrouperRequest) -> GrouperResponse:
        pdx = request.principal_diagnosis.code.upper().strip()
        
        # Analyze secondary diagnoses to determine highest severity level (MCC wins over CC)
        has_mcc = False
        has_cc = False
        
        for s_diag in request.secondary_diagnoses:
            code = s_diag.code.upper().strip()
            if code in self.MCC_CODES:
                has_mcc = True
            elif code in self.CC_CODES:
                has_cc = True

        comp_level = "None"
        if has_mcc:
            comp_level = "MCC"
        elif has_cc:
            comp_level = "CC"

        # Initialize default values
        drg_code = "999"
        drg_description = "UNGROUPABLE"
        relative_weight = 0.0
        mdc_code = "00"

        # Core MS-DRG Decision Trees for MVP Domains
        if pdx == "A41.9":  # Principal Diagnosis: Sepsis
            mdc_code = "18"  # Infectious and Parasitic Diseases
            if comp_level == "MCC":
                drg_code = "871"
                drg_description = "SEPTICEMIA OR SEVERE SEPSIS WITHOUT MV >96 HOURS WITH MCC"
                relative_weight = 1.7824
            else:
                # If there's CC or None, they group together under 872 for Sepsis
                drg_code = "872"
                drg_description = "SEPTICEMIA OR SEVERE SEPSIS WITHOUT MV >96 HOURS WITHOUT MCC"
                relative_weight = 0.9831

        elif pdx == "J18.9":  # Principal Diagnosis: Simple Pneumonia
            mdc_code = "04"  # Diseases and Disorders of the Respiratory System
            if comp_level == "MCC":
                drg_code = "193"
                drg_description = "SIMPLE PNEUMONIA & PLEURISY WITH MCC"
                relative_weight = 1.3415
            elif comp_level == "CC":
                drg_code = "194"
                drg_description = "SIMPLE PNEUMONIA & PLEURISY WITH CC"
                relative_weight = 0.9520
            else:
                drg_code = "195"
                drg_description = "SIMPLE PNEUMONIA & PLEURISY WITHOUT CC/MCC"
                relative_weight = 0.6841

        elif pdx == "J44.1":  # Principal Diagnosis: COPD with acute exacerbation
            mdc_code = "04"  # Respiratory
            if comp_level == "MCC":
                drg_code = "190"
                drg_description = "CHRONIC OBSTRUCTIVE PULMONARY DISEASE WITH MCC"
                relative_weight = 1.1542
            elif comp_level == "CC":
                drg_code = "191"
                drg_description = "CHRONIC OBSTRUCTIVE PULMONARY DISEASE WITH CC"
                relative_weight = 0.8120
            else:
                drg_code = "192"
                drg_description = "CHRONIC OBSTRUCTIVE PULMONARY DISEASE WITHOUT CC/MCC"
                relative_weight = 0.5832

        # Wrap in standard response contract
        return GrouperResponse(
            drg_code=drg_code,
            drg_description=drg_description,
            relative_weight=relative_weight,
            mdc_code=mdc_code,
            complication_level=comp_level,
            raw_response={
                "provider": self.provider_id,
                "pdx_processed": pdx,
                "has_mcc": has_mcc,
                "has_cc": has_cc
            }
        )
