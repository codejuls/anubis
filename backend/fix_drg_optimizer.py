import sys
import os

# Read the original file
with open('app/drg_optimizer.py', 'r') as f:
    lines = f.readlines()

# 1. Add import for MedicalCodeGraph if not present
import_end = 0
for i, line in enumerate(lines):
    if line.startswith('from ') or line.startswith('import '):
        import_end = i + 1

import_lines = []
if not any('from .medical_code_graph.graph import MedicalCodeGraph' in line for line in lines):
    import_lines.append('from .medical_code_graph.graph import MedicalCodeGraph\n')

if import_lines:
    lines = lines[:import_end] + import_lines + lines[import_end:]

# 2. Modify the __init__ method of DRGOptimizer
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
    '            probability=ProbabilityLevel.LOW,  # We do not have strong evidence for these, so low probability',
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
