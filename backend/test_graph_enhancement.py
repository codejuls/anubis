import asyncio
from app.drg_optimizer import DRGOptimizer
from app.schemas import GrouperRequest, GrouperResponse, DiagnosisCode, ProcedureCode
from app.grouper import AnubisMockGrouper
from app.pricer import AnubisMockPricer
from app.guideline_index import FY2026GuidelineIndex
from app.drg_optimizer import DRGKnowledgeBase

async def test_without_graph_vs_with_graph():
    """Test to see if the MedicalCodeGraph adds additional candidates"""
    print('=== Testing Graph Enhancement Effect ===')
    grouper = AnubisMockGrouper()
    pricer = AnubisMockPricer()
    guideline_index = FY2026GuidelineIndex()
    drg_kb = DRGKnowledgeBase()
    
    # Create optimizer WITHOUT providing medical_code_graph (should use default)
    optimizer1 = DRGOptimizer(grouper, pricer, guideline_index, drg_kb)
    
    # Create optimizer WITH providing a medical_code_graph instance
    from app.medical_code_graph.graph import MedicalCodeGraph
    graph = MedicalCodeGraph(data_dir='/opt/data/anubis/knowledge')
    optimizer2 = DRGOptimizer(grouper, pricer, guideline_index, drg_kb, graph)
    
    # Use a case that might benefit from graph enhancement
    # Let's try a case with multiple diagnoses that might connect through guidelines
    case_data = GrouperRequest(
        age=65,
        gender='M',
        discharge_status='01',
        principal_diagnosis=DiagnosisCode(code='E11.9', present_on_admission=True),  # Type 2 diabetes mellitus without complications
        secondary_diagnoses=[
            DiagnosisCode(code='I10', present_on_admission=True),  # Essential hypertension
            DiagnosisCode(code='N18.9', present_on_admission=True)  # Chronic kidney disease, unspecified
        ],
        procedures=[],
        service_date='2026-08-15'
    )

    # We need to know what DRG the grouper would assign - let's use a common one for diabetes
    current_drg = GrouperResponse(
        drg_code='638',  # Diabetes with CC
        drg_description='DIABETES WITH CC',
        relative_weight=1.0,  # approximate
        mdc_code='10',
        complication_level='CC'
    )
    
    print('Testing case: Diabetes with hypertension and CKD')
    print(f'Principal: {case_data.principal_diagnosis.code}')
    print(f'Secondary: {[d.code for d in case_data.secondary_diagnoses]}')
    
    # Test both optimizers
    result1 = await optimizer1.analyze_optimization(case_data, current_drg, 'HOSP-URBAN-001')
    result2 = await optimizer2.analyze_optimization(case_data, current_drg, 'HOSP-URBAN-001')
    
    print(f'\n--- Without explicit graph (uses default) ---')
    print(f'Optimization potential: {result1.optimization_potential}')
    print(f'Target DRG candidates: {len(result1.target_drg_candidates)}')
    for c in result1.target_drg_candidates:
        print(f'  DRG {c.drg_code}: {c.drg_description[:50]}... (delta: ${c.reimbursement_delta:.2f})')
    
    print(f'\n--- With explicit graph instance ---')
    print(f'Optimization potential: {result2.optimization_potential}')
    print(f'Target DRG candidates: {len(result2.target_drg_candidates)}')
    for c in result2.target_drg_candidates:
        print(f'  DRG {c.drg_code}: {c.drg_description[:50]}... (delta: ${c.reimbursement_delta:.2f})')
        
    # Check if we got more candidates with the explicit graph (they should be the same since both use the graph)
    if len(result1.target_drg_candidates) == len(result2.target_drg_candidates):
        print(f'\n������ Both optimizers produced same number of candidates (expected)')
    else:
        print(f'\n��������⚠��️ Different candidate counts: {len(result1.target_drg_candidates)} vs {len(result2.target_drg_candidates)}')
        
    # Verify that the medical_code_graph is properly set
    print(f'\n--- MedicalCodeGraph Verification ---')
    print(f'Optimizer1 has medical_code_graph: {optimizer1.medical_code_graph is not None}')
    print(f'Optimizer2 has medical_code_graph: {optimizer2.medical_code_graph is not None}')
    print(f'Same graph instance: {optimizer1.medical_code_graph is optimizer2.medical_code_graph}')

if __name__ == '__main__':
    asyncio.run(test_without_graph_vs_with_graph())
