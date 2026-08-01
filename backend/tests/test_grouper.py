import pytest
from datetime import date
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import GrouperRequest, DiagnosisCode, ProcedureCode
from app.grouper import AnubisMockGrouper
from app.pricer import AnubisMockPricer

# Initialize FastAPI TestClient
client = TestClient(app)


# --- 1. UNIT TESTS FOR THE INTERNAL MOCK GROUPER ---

@pytest.mark.asyncio
async def test_sepsis_with_mcc():
    """Test Sepsis (pdx) with a secondary MCC (Pneumonia) -> DRG 871"""
    g = AnubisMockGrouper()
    req = GrouperRequest(
        age=68,
        gender="F",
        discharge_status="01",
        principal_diagnosis=DiagnosisCode(code="A41.9"),
        secondary_diagnoses=[DiagnosisCode(code="J18.9")],  # Pneumonia is MCC
        procedures=[],
        service_date=date(2026, 8, 1)
    )
    res = await g.group_case(req)
    assert res.drg_code == "871"
    assert "WITH MCC" in res.drg_description
    assert res.relative_weight == 1.7824
    assert res.complication_level == "MCC"
    assert res.mdc_code == "18"


@pytest.mark.asyncio
async def test_sepsis_with_cc_only():
    """Test Sepsis (pdx) with secondary CC only (COPD) -> DRG 872"""
    g = AnubisMockGrouper()
    req = GrouperRequest(
        age=68,
        gender="F",
        discharge_status="01",
        principal_diagnosis=DiagnosisCode(code="A41.9"),
        secondary_diagnoses=[DiagnosisCode(code="J44.1")],  # COPD is CC
        procedures=[],
        service_date=date(2026, 8, 1)
    )
    res = await g.group_case(req)
    assert res.drg_code == "872"
    assert "WITHOUT MCC" in res.drg_description
    assert res.relative_weight == 0.9831
    assert res.complication_level == "CC"


@pytest.mark.asyncio
async def test_pneumonia_no_cc_mcc():
    """Test Pneumonia (pdx) with no secondary complications -> DRG 195"""
    g = AnubisMockGrouper()
    req = GrouperRequest(
        age=45,
        gender="M",
        discharge_status="01",
        principal_diagnosis=DiagnosisCode(code="J18.9"),
        secondary_diagnoses=[],
        procedures=[],
        service_date=date(2026, 8, 1)
    )
    res = await g.group_case(req)
    assert res.drg_code == "195"
    assert "WITHOUT CC/MCC" in res.drg_description
    assert res.relative_weight == 0.6841
    assert res.complication_level == "None"


# --- 2. UNIT TESTS FOR THE INTERNAL MOCK PRICER ---

@pytest.mark.asyncio
async def test_pricer_urban():
    """Test pricing for Urban Academic Hospital base rate"""
    p = AnubisMockPricer()
    # 1.7824 * 7500.0 = 13368.00
    pay = await p.price_case(relative_weight=1.7824, hospital_id="HOSP-URBAN-001", date_of_service=date(2026, 8, 1))
    assert pay == 13368.00


@pytest.mark.asyncio
async def test_pricer_rural():
    """Test pricing for Rural Critical Access Hospital base rate"""
    p = AnubisMockPricer()
    # 1.7824 * 5900.0 = 10516.16
    pay = await p.price_case(relative_weight=1.7824, hospital_id="HOSP-RURAL-003", date_of_service=date(2026, 8, 1))
    assert pay == 10516.16


# --- 3. ENDPOINT INTEGRATION TESTS (API CONTRACTS) ---

def test_api_health():
    """Test FastAPI health endpoint contract"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["grouper_provider"] == "anubis-internal-mock"
    assert data["pricer_provider"] == "anubis-internal-pricer-mock"


def test_api_group_endpoint():
    """Test POST /api/group endpoint with a complete payload"""
    payload = {
        "age": 68,
        "gender": "F",
        "discharge_status": "01",
        "principal_diagnosis": {"code": "A41.9", "present_on_admission": True},
        "secondary_diagnoses": [
            {"code": "J18.9", "present_on_admission": True}
        ],
        "procedures": [],
        "service_date": "2026-08-01"
    }
    response = client.post("/api/group", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["drg_code"] == "871"
    assert data["relative_weight"] == 1.7824
    assert data["complication_level"] == "MCC"


def test_api_analyze_endpoint():
    """Test POST /api/analyze composite endpoint with hospital selection"""
    payload = {
        "case_data": {
            "age": 68,
            "gender": "F",
            "discharge_status": "01",
            "principal_diagnosis": {"code": "J18.9", "present_on_admission": True},
            "secondary_diagnoses": [
                {"code": "J44.1", "present_on_admission": True}
            ],
            "procedures": [],
            "service_date": "2026-08-01"
        },
        "hospital_id": "HOSP-SUBURBAN-002"
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["grouper_result"]["drg_code"] == "194"
    assert data["grouper_result"]["complication_level"] == "CC"
    # Weight for 194 is 0.9520. Suburban rate is 6800.0.
    # 0.9520 * 6800.0 = 6473.60
    assert data["price_result"] == 6473.60
    assert data["hospital_id"] == "HOSP-SUBURBAN-002"
