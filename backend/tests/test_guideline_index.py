import pytest
from app.guideline_index import FY2026GuidelineIndex

def test_fy2026_guideline_index_loading():
    idx = FY2026GuidelineIndex()
    assert idx.index_data["metadata"]["effective_fiscal_year"] == "FY2026"
    assert len(idx.index_data["guideline_index"]) > 0

def test_search_by_code_sepsis():
    idx = FY2026GuidelineIndex()
    results = idx.search_by_code("A41.9")
    assert len(results) > 0
    assert "A41.9" in results[0]["associated_codes"]

def test_get_citation_by_id():
    idx = FY2026GuidelineIndex()
    first_id = idx.index_data["guideline_index"][0]["guideline_id"]
    citation = idx.get_citation_by_id(first_id)
    assert citation is not None
    assert citation["guideline_id"] == first_id
