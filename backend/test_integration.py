import asyncio
from app.drg_optimizer import DRGOptimizer
from app.schemas import GrouperRequest, GrouperResponse, DiagnosisCode, ProcedureCode
from app.grouper import AnubisMockGrouper
from app.pricer import AnubisMockPricer
from app.guideline_index import FY2026GuidelineIndex
from app.drg_optimizer import DRGKnowledgeBase

async def test():
    print('Testing DRGOptimizer with MedicalCodeGraph integration...')
    grouper = AnubisMockGrouper()
    pricer = AnubisMockPricer()
    guideline_index = FY2026GuidelineIndex()
    drg_kb = DRGKnowledgeBase()
    optimizer = DRGOptimizer(grouper, pricer, guideline_index, drg_kb)
    
    # Test case: Sepsis with MCC (current DRG 871)
    case_data = GrouperRequest(
        age=68,
        gender='F',
        discharge_status='01',
        principal_diagnosis=DiagnosisCode(code='A41.9', present_on_admission=True),
        secondary_diagnoses=[
            DiagnosisCode(code='J18.9', present_on_admission=True),
            DiagnosisCode(code='I10', present_on_admission=True)
        ],
        procedures=[
            ProcedureCode(code='02RF33Z', date_of_service='2026-08-01')
        ],
        service_date='2026-08-15'
    )

    current_drg = GrouperResponse(
        drg_code='871',
        drg_description='SEPTICEMIA OR SEVERE SEPSIS WITHOUT MV >96 HOURS WITH MCC',
        relative_weight=1.7824,
        mdc_code='18',
        complication_level='MCC'
    )

    result = await optimizer.analyze_optimization(case_data, current_drg, 'HOSP-URBAN-001')
    print(f'Optimization potential: {result.optimization_potential}')
    print(f'Current reimbursement: ${result.current_reimbursement:.2f}')
    print(f'Target DRG candidates: {len(result.target_drg_candidates)}')
    for c in result.target_drg_candidates:
        print(f'  DRG {c.drg_code}: weight={c.relative_weight:.4f}, delta=${c.reimbursement_delta:.2f}, prob={c.probability}')
    print(f'Documentation gaps: {len(result.documentation_gaps)}')
    print(f'Query worthiness: {result.query_worthiness_score}/10')
    print('��✅ Test completed successfully!')
    return result

if __name__ == '__main__':
    asyncio.run(test())
