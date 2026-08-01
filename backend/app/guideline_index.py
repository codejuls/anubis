import json
import os
from typing import Dict, Any, List, Optional

class FY2026GuidelineIndex:
    """
    FY2026 Official Guidelines Index Manager.
    Queries structured metadata and citations from local FY2026 guideline indices.
    """

    def __init__(self, index_path: Optional[str] = None):
        default_path = os.path.join(
            os.path.dirname(__file__), "../../knowledge/fy2026_guidelines_index.json"
        )
        self.index_path = index_path or default_path
        self.index_data = self._load_index()

    def _load_index(self) -> Dict[str, Any]:
        if not os.path.exists(self.index_path):
            return {"metadata": {}, "guideline_index": []}
        with open(self.index_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def search_by_code(self, code: str) -> List[Dict[str, Any]]:
        """Finds all FY2026 guideline citations matching a specific ICD-10 code."""
        clean_code = code.upper().strip()
        results = []
        for entry in self.index_data.get("guideline_index", []):
            if clean_code in entry.get("associated_codes", []):
                results.append(entry)
        return results

    def get_citation_by_id(self, guideline_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a specific guideline citation entry by its ID (e.g. 'I.C.1.d.1.a')."""
        for entry in self.index_data.get("guideline_index", []):
            if entry.get("guideline_id") == guideline_id:
                return entry
        return None
