from abc import ABC, abstractmethod
from datetime import date

# 1. Abstract Base Class for "Bring Your Own Pricer" (BYOP)
class BasePricerAdapter(ABC):
    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Returns the unique identifier of the pricer provider."""
        pass

    @abstractmethod
    async def price_case(self, relative_weight: float, hospital_id: str, date_of_service: date) -> float:
        """Returns the calculated payment amount based on the relative weight."""
        pass


# 2. Our "Little" Mock Pricer Engine
class AnubisMockPricer(BasePricerAdapter):
    @property
    def provider_id(self) -> str:
        return "anubis-internal-pricer-mock"

    # Standard hospital base operating rates for simulation
    HOSPITAL_BASE_RATES = {
        "HOSP-URBAN-001": 7500.0,   # Major Urban Academic Medical Center
        "HOSP-SUBURBAN-002": 6800.0, # Suburban Community Hospital
        "HOSP-RURAL-003": 5900.0,    # Rural Critical Access Hospital
        "DEFAULT": 7200.0            # Standard baseline
    }

    async def price_case(self, relative_weight: float, hospital_id: str, date_of_service: date) -> float:
        base_rate = self.HOSPITAL_BASE_RATES.get(hospital_id.upper().strip(), self.HOSPITAL_BASE_RATES["DEFAULT"])
        # Simple IPPS Pricing Calculation: payment = weight * base_rate
        payment = round(relative_weight * base_rate, 2)
        return payment
