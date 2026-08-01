import pytest
from app.guideline_index import FY2026GuidelineIndex

def test_fy2026_guideline_index_loading():
    idx = FY2026GuidelineIndex()
    assert idx.index_data["metadata"]["effective_fiscal_year"] == "FY2026"

def test_search_by_code_sepsis():
    idx = FY2026GuidelineIndex()
    results = idx.search_by_code("A41.9")
    assert len(results) > 0
    assert results[0]["guideline_id"] == "I.C.1.d.1.a"
    assert "Section I.C.1.d" in results[0]["section"]

def test_get_citation_by_id():
    idx = FY2026GuidelineIndex()
    citation = idx.get_citation_by_id("I.C.10.a")
    assert citation is not None
    assert citation["associated_codes"] == ["J18.9", "J15.9", "J13"]
