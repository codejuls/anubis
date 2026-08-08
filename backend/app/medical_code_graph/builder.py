"""
Build the medical code graph JSON files from Anubis' knowledge sources.
Reads:
- /opt/data/anubis/knowledge/fy2026_guidelines_index.json
- /opt/data/anubis/knowledge/drg/fy2026_drg_weights.json
Writes:
- /opt/data/anubis/knowledge/code_drg_mdc_nodes.json
- /opt/data/anubis/knowledge/code_drg_mdc_edges.json
"""
import json
import re
from pathlib import Path


def load_json(filepath: Path) -> dict:
    """Read a file that may be in line-numbered format or plain JSON."""
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        # Hermes format: each line "NUM|CONTENT"
        content_parts = []
        with open(filepath, "r") as f:
            for line in f:
                if "|" in line:
                    _, rest = line.split("|", 1)
                    content_parts.append(rest)
        return json.loads("".join(content_parts))


def build_graph():
    base = Path("/opt/data/anubis/knowledge")
    guidelines_file = base / "fy2026_guidelines_index.json"
    drg_file = base / "drg" / "fy2026_drg_weights.json"

    guidelines_data = load_json(guidelines_file)
    drg_data = load_json(drg_file)

    guidelines = guidelines_data.get("guideline_index", [])
    drg_weights = drg_data.get("drg_weights", {})
    mdc_hierarchy = drg_data.get("mdc_hierarchy", {})

    # Code -> list of guideline IDs
    code_to_guidelines = {}
    for gl in guidelines:
        gl_id = gl.get("guideline_id")
        for code in gl.get("associated_codes", []):
            code_to_guidelines.setdefault(code, []).append(gl_id)

    # MDC name -> MDC code
    mdc_name_to_code = {info["name"]: code for code, info in mdc_hierarchy.items()}

    # Guideline -> MDC (by matching MDC name in title/section)
    guideline_to_mdc = []  # (guideline_id, mdc_code)
    for gl in guidelines:
        gl_id = gl.get("guideline_id")
        title = gl.get("title", "").lower()
        section = gl.get("section", "").lower()
        combined = f"{title} {section}"
        for mdc_name, mdc_code in mdc_name_to_code.items():
            if mdc_name.lower() in combined:
                guideline_to_mdc.append((gl_id, mdc_code))

    # DRG -> MDC (each DRG has an mdc field)
    drg_to_mdc = []  # (drg_code, mdc_code)
    for drg_code, info in drg_weights.items():
        mdc_code = info.get("mdc")
        if mdc_code:
            drg_to_mdc.append((drg_code, mdc_code))

    # Build edges
    edges = []
    # Code -> Guideline
    for code, glist in code_to_guidelines.items():
        for gl in glist:
            edges.append({"source": code, "target": gl, "type": "code_guideline"})
    # Guideline -> MDC
    for gl_id, mdc_code in guideline_to_mdc:
        edges.append({"source": gl_id, "target": mdc_code, "type": "guideline_mdc"})
    # DRG -> MDC
    for drg_code, mdc_code in drg_to_mdc:
        edges.append({"source": drg_code, "target": mdc_code, "type": "drg_mdc"})

    # Build nodes
    nodes = []
    # Guideline nodes
    for gl in guidelines:
        nodes.append({
            "id": gl.get("guideline_id"),
            "label": gl.get("title"),
            "type": "guideline"
        })
    # DRG nodes
    for drg_code, info in drg_weights.items():
        nodes.append({
            "id": drg_code,
            "label": info.get("description"),
            "type": "drg"
        })
    # MDC nodes
    for mdc_code, info in mdc_hierarchy.items():
        nodes.append({
            "id": mdc_code,
            "label": info.get("name"),
            "type": "mdc"
        })
    # Note: We do not create code nodes with labels because the guidelines index
    # does not provide code descriptions. Code identity is carried by edges.

    out_nodes = base / "code_drg_mdc_nodes.json"
    out_edges = base / "code_drg_mdc_edges.json"

    with open(out_nodes, "w") as f:
        json.dump(nodes, f, indent=2)
    with open(out_edges, "w") as f:
        json.dump(edges, f, indent=2)

    print(f"Graph built: {len(nodes)} nodes, {len(edges)} edges")
    print(f"Saved nodes to {out_nodes}")
    print(f"Saved edges to {out_edges}")


if __name__ == "__main__":
    build_graph()