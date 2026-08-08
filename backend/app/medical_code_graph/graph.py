"""
Medical code graph implementation for Anubis.
Loads the pre-built JSON nodes/edges and provides traversal methods.
"""
import json
import re
from pathlib import Path
from typing import Dict, List, Set, Optional, Any


class MedicalCodeGraph:
    def __init__(self, data_dir: str = "/opt/data/anubis/knowledge"):
        self.data_dir = Path(data_dir)
        self.nodes: List[Dict] = []
        self.edges: List[Dict] = []
        self.node_by_id: Dict[str, Dict] = {}
        self.outgoing: Dict[str, List[Dict]] = {}
        self.incoming: Dict[str, List[Dict]] = {}
        self._loaded = False

    def load(self):
        """Load nodes and edges from JSON files."""
        nodes_file = self.data_dir / "code_drg_mdc_nodes.json"
        edges_file = self.data_dir / "code_drg_mdc_edges.json"
        if not nodes_file.is_file() or not edges_file.is_file():
            raise FileNotFoundError(
                f"Graph data not found in {self.data_dir}. "
                "Run the build script to generate nodes and edges."
            )
        with open(nodes_file, "r") as f:
            self.nodes = json.load(f)
        with open(edges_file, "r") as f:
            self.edges = json.load(f)

        # Build indexes
        self.node_by_id = {node["id"]: node for node in self.nodes}
        self.outgoing = {}
        self.incoming = {}
        for edge in self.edges:
            self.outgoing.setdefault(edge["source"], []).append(edge)
            self.incoming.setdefault(edge["target"], []).append(edge)
        self._loaded = True

    def get_node(self, node_id: str) -> Optional[Dict]:
        if not self._loaded:
            self.load()
        return self.node_by_id.get(node_id)

    def get_neighbors(self, node_id: str, hops: int = 1) -> Set[str]:
        """Return nodes reachable via outgoing edges within `hops` steps."""
        if not self._loaded:
            self.load()
        if node_id not in self.node_by_id:
            return set()
        visited = set()
        frontier = {node_id}
        for _ in range(hops):
            next_frontier = set()
            for node in frontier:
                for edge in self.outgoing.get(node, []):
                    next_frontier.add(edge["target"])
            visited.update(frontier)
            frontier = next_frontier
            if not frontier:
                break
        visited.update(frontier)
        return visited

    def get_related_codes(self, code: str) -> Set[str]:
        """Codes that share at least one guideline with the given code."""
        if not self._loaded:
            self.load()
        # Get guidelines for this code (outgoing code_guideline edges)
        guideline_ids = {
            edge["target"]
            for edge in self.outgoing.get(code, [])
            if edge["type"] == "code_guideline"
        }
        related: Set[str] = set()
        for gl in guideline_ids:
            for edge in self.incoming.get(gl, []):
                if edge["type"] == "code_guideline":
                    related.add(edge["source"])
        related.discard(code)
        return related

    def get_possible_drgs_for_codes(self, codes: List[str]) -> Set[str]:
        """
        Return DRGs reachable via:
        code -> guideline -> MDC -> DRG
        (using outgoing code_guideline, outgoing guideline_mdc, incoming drg_mdc)
        """
        if not self._loaded:
            self.load()
        possible: Set[str] = set()
        for code in codes:
            for e1 in self.outgoing.get(code, []):
                if e1["type"] != "code_guideline":
                    continue
                guideline = e1["target"]
                for e2 in self.outgoing.get(guideline, []):
                    if e2["type"] != "guideline_mdc":
                        continue
                    mdc = e2["target"]
                    # drg_mdc edges are DRG -> MDC, so we look for incoming edges to MDC
                    for e3 in self.incoming.get(mdc, []):
                        if e3["type"] == "drg_mdc":
                            possible.add(e3["source"])
        return possible

    def generate_tip_for_codes(self, codes: List[str]) -> str:
        """Produce a simple natural-language tip from the graph."""
        if not self._loaded:
            self.load()
        if not codes:
            return "No codes provided."
        # Use the first code to build a basic tip
        code = codes[0]
        # Look for a guideline that gives us a path to MDC and DRG
        for e1 in self.outgoing.get(code, []):
            if e1["type"] != "code_guideline":
                continue
            guideline_id = e1["target"]
            guideline_node = self.get_node(guideline_id)
            guideline_label = guideline_node.get("label") if guideline_node else guideline_id
            for e2 in self.outgoing.get(guideline_id, []):
                if e2["type"] != "guideline_mdc":
                    continue
                mdc_id = e2["target"]
                mdc_node = self.get_node(mdc_id)
                mdc_label = mdc_node.get("label") if mdc_node else mdc_id
                # Find DRGs for this MDC
                drgs = [
                    e3["source"]
                    for e3 in self.incoming.get(mdc_id, [])
                    if e3["type"] == "drg_mdc"
                ]
                if drgs:
                    drg_list = ", ".join(sorted(drgs)[:3])
                    return (
                        f"Code {code} is linked to guideline '{guideline_label}', "
                        f"which relates to the {mdc_label} MDC. This MDC includes DRGs such as {drg_list}."
                    )
        # Fallback
        related = self.get_related_codes(code)
        return (
            f"Code {code} exists in the knowledge graph and is associated with "
            f"{len(related)} other codes via shared guidelines."
        )