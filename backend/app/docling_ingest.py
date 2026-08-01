import os
import json
import re
from typing import Dict, Any, List, Optional
from docling.document_converter import DocumentConverter

class DoclingGuidelineIngestor:
    """
    Ingests official coding guideline PDFs using IBM Docling, 
    extracts hierarchical sections and citations, and builds a clean 
    FY2026 Guideline Index (JSON) without committing raw PDFs to source control.
    """

    def __init__(self, output_index_path: Optional[str] = None):
        default_out = os.path.join(
            os.path.dirname(__file__), "../../knowledge/fy2026_guidelines_index.json"
        )
        self.output_index_path = output_index_path or default_out
        self.converter = DocumentConverter()

    def convert_pdf_to_markdown(self, pdf_path: str) -> str:
        """Converts a raw PDF document to clean structured Markdown via Docling."""
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found at {pdf_path}")
        
        result = self.converter.convert(pdf_path)
        markdown_text = result.document.export_to_markdown()
        return markdown_text

    def parse_markdown_to_index(self, markdown_text: str, fiscal_year: str = "FY2026") -> Dict[str, Any]:
        """
        Parses structured Markdown extracted by Docling into the FY2026 Guideline Index schema.
        """
        guidelines = []
        
        # Split markdown into section blocks
        sections = re.split(r'\n(?=#{1,4}\s+)', markdown_text)
        
        for idx, block in enumerate(sections):
            lines = [l.strip() for l in block.split('\n') if l.strip()]
            if not lines:
                continue
            
            header = lines[0].lstrip('#').strip()
            body = " ".join(lines[1:])
            
            # Extract guideline IDs (e.g., Section I.C.1.d or Guideline I.C.10.a)
            guideline_match = re.search(r'(I\.[A-Z]\.\d+(\.[a-z]+)*)', header)
            guideline_id = guideline_match.group(1) if guideline_match else f"SEC-{idx+1}"
            
            # Extract associated ICD-10 code patterns (e.g. A41.9, J18.9, J44.1)
            codes = list(set(re.findall(r'\b[A-Z]\d{2}(?:\.\d{1,2})?\b', block)))
            
            guidelines.append({
                "guideline_id": guideline_id,
                "section": f"Section {header}",
                "title": header,
                "citation": f"ICD-10-CM Official Guidelines {fiscal_year}, Section {guideline_id}",
                "associated_codes": codes,
                "summary_rationale": body[:300] + ("..." if len(body) > 300 else "")
            })

        index_package = {
            "metadata": {
                "effective_fiscal_year": fiscal_year,
                "parser_engine": "Docling Document Converter (IBM Research)",
                "source_authority": "CMS / NCHS Official Guidelines for Coding and Reporting",
                "generated_at": os.getenv("INGEST_DATE", "2026-08-01")
            },
            "guideline_index": guidelines
        }
        
        return index_package

    def process_and_save(self, pdf_path: str, fiscal_year: str = "FY2026") -> Dict[str, Any]:
        """Converts PDF with Docling, builds the guideline index, and saves to knowledge base."""
        markdown_text = self.convert_pdf_to_markdown(pdf_path)
        index_package = self.parse_markdown_to_index(markdown_text, fiscal_year=fiscal_year)
        
        # Ensure parent directory exists
        os.makedirs(os.path.dirname(self.output_index_path), exist_ok=True)
        
        with open(self.output_index_path, 'w', encoding='utf-8') as f:
            json.dump(index_package, f, indent=2)

        return index_package


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        pdf_input = sys.argv[1]
        ingestor = DoclingGuidelineIngestor()
        print(f"Processing raw PDF '{pdf_input}' with Docling...")
        pkg = ingestor.process_and_save(pdf_input)
        print(f"Success! Generated index with {len(pkg['guideline_index'])} entries at {ingestor.output_index_path}")
    else:
        print("Usage: python -m app.docling_ingest <path_to_guidelines.pdf>")
