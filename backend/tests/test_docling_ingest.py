import pytest
from app.docling_ingest import DoclingGuidelineIngestor

def test_docling_markdown_parser():
    ingestor = DoclingGuidelineIngestor()
    
    sample_markdown = """
# Section I.C.1.d Sepsis Guidelines

When sepsis is present on admission (POA), sequence A41.9 first.

## Section I.C.10.a Pneumonia Guidelines

Pneumonia J18.9 is classified as an MCC when secondary to sepsis.
"""
    
    pkg = ingestor.parse_markdown_to_index(sample_markdown, fiscal_year="FY2026")
    
    assert pkg["metadata"]["effective_fiscal_year"] == "FY2026"
    assert pkg["metadata"]["parser_engine"] == "Docling Document Converter (IBM Research)"
    
    guidelines = pkg["guideline_index"]
    assert len(guidelines) >= 2
    assert "A41.9" in guidelines[0]["associated_codes"]
    assert "J18.9" in guidelines[1]["associated_codes"]
