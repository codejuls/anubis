import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.nlp_parser import ClinicalNLPParser

client = TestClient(app)

@pytest.mark.asyncio
async def test_nlp_parser_sepsis_match():
    parser = ClinicalNLPParser()
    res = await parser.parse_highlight("patient presents with severe sepsis and fever")
    assert res.suggested_code == "A41.9"
    assert res.severity_type == "Principal Candidate"
    assert "AHA Coding Clinic" in res.official_citation

@pytest.mark.asyncio
async def test_nlp_parser_pneumonia_match():
    parser = ClinicalNLPParser()
    res = await parser.parse_highlight("Chest X-Ray shows infiltrate in lower lobe")
    assert res.suggested_code == "J18.9"
    assert res.severity_type == "MCC"

@pytest.mark.asyncio
async def test_nlp_parser_copd_match():
    parser = ClinicalNLPParser()
    res = await parser.parse_highlight("patient with worsening dyspnea and history of COPD")
    assert res.suggested_code == "J44.1"
    assert res.severity_type == "CC"

def test_api_extract_endpoint():
    """Test POST /api/extract endpoint"""
    payload = {"selected_text": "Lactate level is elevated at 3.1 mmol/L with systemic sepsis"}
    response = client.post("/api/extract", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["suggested_code"] == "A41.9"
    assert "Sepsis" in data["description"]
    assert "AHA Coding Clinic" in data["official_citation"]

@pytest.mark.asyncio
async def test_nlp_parser_attaches_fy2026_guideline_references():
    """
    Regression test for the Abstractor Sandbox reference lookup feature:
    every rule-matched suggestion must be cross-referenced against the local
    FY2026GuidelineIndex (built from the AHA Coding Handbook) so the sandbox
    can render the actual guideline sections tied to the suggested code.
    """
    parser = ClinicalNLPParser()
    res = await parser.parse_highlight("patient presents with severe sepsis and fever")
    assert res.suggested_code == "A41.9"
    assert len(res.references) > 0
    ref = res.references[0]
    assert "guideline_id" in ref and "citation" in ref and "title" in ref

def test_api_extract_endpoint_includes_references():
    """POST /api/extract should surface guideline_index references in the payload."""
    payload = {"selected_text": "patient with severe sepsis"}
    response = client.post("/api/extract", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "references" in data
    assert len(data["references"]) > 0
    assert data["references"][0]["citation"]
