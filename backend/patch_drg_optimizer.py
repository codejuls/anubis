import sys

# Read the original file
with open('app/drg_optimizer.py', 'r') as f:
    lines = f.readlines()

# 1. Add imports: Optional and MedicalCodeGraph
# Find where the imports end (first non-import line after the imports block)
import_end = 0
for i, line in enumerate(lines):
    if line.startswith('from ') or line.startswith('import '):
        import_end = i + 1

import_lines = []
if not any('from typing import Optional' in line for line in lines):
    import_lines.append('from typing import Optional\n')
if not any('from .medical_code_graph.graph import MedicalCodeGraph' in line for line in lines):
    import_lines.append('from .medical_code_graph.graph import MedicalCodeGraph\n')
if import_lines:
    lines = lines[:import_end] + import_lines + lines[import_end:]

# 2. Modify the __init__ method of DRGOptimizer
# Find the class DRGOptimizer
class_start = -1
for i, line in enumerate(lines):
    if line.strip() == 'class DRGOptimizer:':
        class_start = i
        break

if class_start == -1:
    print('ERROR: Could not find class DRGOptimizer')
    sys.exit(1)

# Find the __init__ method within the class
init_start = -1
for i in range(class_start, len(lines)):
    if lines[i].strip().startswith('def __init__'):
        init_start = i
        break

if init_start == -1:
    print('ERROR: Could not find __init__ method in DRGOptimizer')
    sys.exit(1)

# Find the end of the __init__ method
init_end = -1
for i in range(init_start+1, len(lines)):
    if lines[i].strip().startswith('def ') or lines[i].strip().startswith('class ') or i == len(lines)-1:
        init_end = i
        break
if init_end == -1:
    init_end = len(lines)

# Get the indentation of the class line (should be 0, but let's be safe)
class_indent = len(lines[class_start]) - len(lines[class_start].lstrip())
method_indent = class_indent + 4

# Build the new __init__ method
new_init_lines = [
    f'{" " * method_indent}def __init__(\n',
    f'{" " * (method_indent + 4)}self,\n',
    f'{" " * (method_indent + 4)}grouper: AnubisMockGrouper,\n',
    f'{" " * (method_indent + 4)}pricer: AnubisMockPricer,\n',
    f'{" " * (method_indent + 4)}guideline_index: FY2026GuidelineIndex,\n',
    f'{" " * (method_indent + 4)}drg_kb: DRGKnowledgeBase,\n',
    f'{" " * (method_indent + 4)}medical_code_graph: Optional[MedicalCodeGraph] = None\n',
    f'{" " * method_indent}):\n',
    f'{" " * (method_indent + 4)}self.grouper = grouper\n',
    f'{" " * (method_indent + 4)}self.pricer = pricer\n',
    f'{" " * (method_indent + 4)}self.guideline_index = guideline_index\n',
    f'{" " * (method_indent + 4)}self.drg_kb = drg_kb\n',
    f'{" " * (method_indent + 4)}self.medical_code_graph = medical_code_graph or MedicalCodeGraph(data_dir="/opt/data/anubis/knowledge")\n',
    f'{" " * (method_indent + 4)}self.clinical_mapper = DRGClinicalMapper(drg_kb)\n',
    f'{" " * (method_indent + 4)}self.query_scorer = QueryOpportunityScorer()\n'
]

# Replace the __init__ method
lines = lines[:init_start] + new_init_lines + lines[init_end:]

# 3. Modify the _enumerate_target_drg_candidates method to add graph-based candidates
# Find the _enumerate_target_drg_candidates method
method_start = -1
for i, line in enumerate(lines):
    if line.strip().startswith('def _enumerate_target_drg_candidates'):
        method_start = i
        break

if method_start == -1:
    print('ERROR: Could not find _enumerate_target_drg_candidates method')
    sys.exit(1)

# Find the end of the method
method_end = -1
for i in range(method_start+1, len(lines)):
    if lines[i].strip().startswith('def ') or lines[i].strip().startswith('class ') or i == len(lines)-1:
        method_end = i
        break
if method_end == -1:
    method_end = len(lines)

# We'll insert our graph-based enhancement after we have the current reimbursement and before the sepsis example.
# Let's look at the method body to find a good place.
# We'll extract the method body lines
method_body_lines = lines[method_start+1:method_end]

# We want to insert after the line that contains '# Current reimbursement' and before the sepsis example.
# Let's find the line number of '# Current reimbursement' in the method body.
lines_after_method_start = lines[method_start+1:method_end]
current_reimbursement_line = -1
for i, line in enumerate(lines_after_method_start):
    if '# Current reimbursement' in line:
        current_reimbursement_line = method_start+1 + i
        break

if current_reimbursement_line == -1:
    # Fallback: insert after the line that contains 'hospital_base_rate = self._get_hospital_base_rate'
    for i, line in enumerate(lines_after_method_start):
        if 'hospital_base_rate = self._get_hospital_base_rate' in line:
            current_reimbursement_line = method_start+1 + i
            break

if current_reimbursement_line == -1:
    # Last fallback: insert at the end of the method (before the return)
    # We'll just append before the last few lines (we'll insert before the line that contains 'return candidates')
    for i in range(len(lines_after_method_start)-1, -1, -1):
        if 'return candidates' in lines_after_method_start[i]:
            current_reimbursement_line = method_start+1 + i
            break

if current_reimbursement_line == -1:
    print('ERROR: Could not find a good insertion point for graph-based enhancement')
    sys.exit(1)

# Determine the indentation at the insertion point (should be the same as the method body)
insert_indent = len(lines[current_reimbursement_line]) - len(lines[current_reimbursement_line].lstrip())

# Build the graph enhancement block
graph_enhancement_lines = [
    f'{" " * insert_indent}# Graph-based enhancement: find possible DRGs from the codes via the medical code graph\n',
    f'{" " * insert_indent}try:\n',
    f'{" " * (insert_indent + 4)}# Get the current codes (principal and secondary diagnoses)\n',
    f'{" " * (insert_indent + 4)}all_codes = [principal_diagnosis] + secondary_diagnoses\n',
    f'{" " * (insert_indent + 4)}possible_drgs_from_graph = self.medical_code_graph.get_possible_drgs_for_codes(all_codes)\n',
    f'{" " * (insert_indent + 4)}for drg_code in possible_drgs_from_graph:\n',
    f'{" " * (insert_indent + 8)}# Skip if this DRG is already in candidates (by drg_code)\n',
    f'{" " * (insert_indent + 8)}if any(candidate.drg_code == drg_code for candidate in candidates):\n',
    f'{" " * (insert_indent + 12)}continue\n',
    f'{" " * (insert_indent + 8)}# Get the DRG weight and info from the knowledge base\n',
    f'{" " * (insert_indent + 8)}drg_weight = self.drg_kb.get_drg_weight(drg_code)\n',
    f'{" " * (insert_indent + 8)}if drg_weight is None:\n',
    f'{" " * (insert_indent + 12)}continue\n',
    f'{" " * (insert_indent + 8)}drg_info = self.drg_kb.get_drg_info(drg_code)\n',
    f'{" " * (insert_indent + 8)}drg_description = drg_info.get(\'description\', \'\') if drg_info else \'\'\n',
    f'{" " * (insert_indent + 8)}# Calculate reimbursement for this DRG\n',
    f'{" " * (insert_indent + 8)}reimbursement_drg = self._get_current_reimbursement(drg_weight, hospital_base_rate)\n',
    f'{" " * (insert_indent + 8)}reimbursement_delta = reimbursement_drg - current_reimbursement\n',
    f'{" " * (insert_indent + 8)}\n',
    f'{" " * (insert_indent + 8)}candidates.append(DRGCandidate(\n',
    f'{" " * (insert_indent + 12)}drg_code=drg_code,\n',
    f'{" " * (indent_indent + 12)}drg_description=drg_description,\n',
    f'{" " * (insert_indent + 12)}relative_weight=drg_weight,\n',
    f'{" " * (insert_indent + 12)}reimbursement_delta=reimbursement_delta,\n',
    f'{" " * (insert_indent + 12)}probability=ProbabilityLevel.LOW,  # We don\\'t have strong evidence for these, so low probability\n',
    f'{" " * (insert_indent + 12)}requirements=[],\n',
    f'{" " * (insert_indent + 12)}query_recommendations=[]\n',
    f'{" " * (insert_indent + 8)})\n',
    f'{" " * insert_indent}except Exception as e:\n',
    f'{" " * (insert_indent + 4)}# If the graph enhancement fails, we just continue with the original candidates\n',
    f'{" " * (insert_indent + 4)}pass\n'
]

# Fix the typo in the above: there's a line with "indent_indent" -> change to "insert_indent"
# Let's rebuild the graph_enhancement_lines correctly.

# We'll do it step by step to avoid mistakes.
graph_enhancement_lines = []
graph_enhancement_lines.append(' ' * insert_indent + '# Graph-based enhancement: find possible DRGs from the codes via the medical code graph\n')
graph_enhancement_lines.append(' ' * insert_indent + 'try:\n')
graph_enhancement_lines.append(' ' * (insert_indent + 4) + '# Get the current codes (principal and secondary diagnoses)\n')
graph_enhancement_lines.append(' ' * (insert_indent + 4) + 'all_codes = [principal_diagnosis] + secondary_diagnoses\n')
graph_enhancement_lines.append(' ' * (insert_indent + 4) + 'possible_drgs_from_graph = self.medical_code_graph.get_possible_drgs_for_codes(all_codes)\n')
graph_enhancement_lines.append(' ' * (insert_indent + 4) + 'for drg_code in possible_drgs_from_graph:\n')
graph_enhancement_lines.append(' ' * (insert_indent + 8) + '# Skip if this DRG is already in candidates (by drg_code)\n')
graph_enhancement_lines.append(' ' * (insert_indent + 8) + 'if any(candidate.drg_code == drg_code for candidate in candidates):\n')
graph_enhancement_lines.append(' ' * (indent_indent + 12) + 'continue\n')  # Oops, we have a typo here. Let's fix by rebuilding.

# Let's start over and write the block correctly with a fixed indent.
# We'll use a list of strings and then join.

graph_enhancement_block = [
    '# Graph-based enhancement: find possible DRGs from the codes via the medical code graph',
    'try:',
    '    # Get the current codes (principal and secondary diagnoses)',
    '    all_codes = [principal_diagnosis] + secondary_diagnoses',
    '    possible_drgs_from_graph = self.medical_code_graph.get_possible_drgs_for_codes(all_codes)',
    '    for drg_code in possible_drgs_from_graph:',
    '        # Skip if this DRG is already in candidates (by drg_code)',
    '        if any(candidate.drg_code == drg_code for candidate in candidates):',
    '            continue',
    '        # Get the DRG weight and info from the knowledge base',
    '        drg_weight = self.drg_kb.get_drg_weight(drg_code)',
    '        if drg_weight is None:',
    '            continue',
    '        drg_info = self.drg_kb.get_drg_info(drg_code)',
    '        drg_description = drg_info.get(\'description\', \'\') if drg_info else \'\'',
    '        # Calculate reimbursement for this DRG',
    '        reimbursement_drg = self._get_current_reimbursement(drg_weight, hospital_base_rate)',
    '        reimbursement_delta = reimbursement_drg - current_reimbursement',
    '',
    '        candidates.append(DRGCandidate(',
    '            drg_code=drg_code,',
    '            drg_description=drg_description,',
    '            relative_weight=drg_weight,',
    '            reimbursement_delta=reimbursement_delta,',
    '            probability=ProbabilityLevel.LOW,  # We don\\'t have strong evidence for these, so low probability',
    '            requirements=[],',
    '            query_recommendations=[]',
    '        )',
    'except Exception as e:',
    '    # If the graph enhancement fails, we just continue with the original candidates',
    '    pass'
]

# Now we need to indent each line by insert_indent spaces.
graph_enhancement_lines = [(' ' * insert_indent) + line + '\n' for line in graph_enhancement_block]

# Insert the graph_enhancement lines after the current_reimbursement_line
lines = lines[:current_reimbursement_line+1] + graph_enhancement_lines + lines[current_reimbursement_line+1:]

# Write back to the file
with open('app/drg_optimizer.py', 'w') as f:
    f.writelines(lines)

print('SUCCESS: Enhanced DRGOptimizer with MedicalCodeGraph integration')
