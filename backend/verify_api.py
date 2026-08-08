import json
from urllib.request import Request, urlopen

# Test the exact same case as in the unit test
data = {
    'case_data': {
        'age': 68,
        'gender': 'F',
        'discharge_status': '01',
        'principal_diagnosis': {'code': 'A41.9', 'present_on_admission': True},
        'secondary_diagnoses': [
            {'code': 'J18.9', 'present_on_admission': True},
            {'code': 'I10', 'present_on_admission': True}
        ],
        'procedures': [
            {'code': '02RF33Z', 'date_of_service': '2026-08-01'}
        ],
        'service_date': '2026-08-15'
    },
    'current_drg': {
        'drg_code': '871',
        'drg_description': 'SEPTICEMIA OR SEVERE SEPSIS WITHOUT MV >96 HOURS WITH MCC',
        'relative_weight': 1.7824,
        'mdc_code': '18',
        'complication_level': 'MCC'
    },
    'hospital_id': 'HOSP-URBAN-001'
}

req = Request(
    'http://localhost:8000/api/optimize',
    data=json.dumps(data).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

try:
    with urlopen(req) as response:
        result = json.loads(response.read().decode())
        print('��✅ API endpoint test PASSED')
        print(f'Optimization potential: {result["optimization_potential"]}')
        print(f'Current reimbursement: ${result["current_reimbursement"]:.2f}')
        print(f'Target DRG candidates: {len(result["target_drg_candidates"])}')
        for c in result['target_drg_candidates']:
            print(f'  - DRG {c["drg_code"]}: {c["drg_description"]} (delta: ${c["reimbursement_delta"]:.2f})')
        print(f'Documentation gaps: {len(result["documentation_gaps"])}')
        print(f'Query worthiness: {result["query_worthiness_score"]}/10')
        
        # Verify the specific assertions from the unit test
        assert result['optimization_potential'] in ['HIGH', 'MEDIUM', 'LOW', 'NONE']
        assert result['current_reimbursement'] > 0
        assert len(result['target_drg_candidates']) >= 1
        assert 0 <= result['query_worthiness_score'] <= 10
        
        drg_codes = [c['drg_code'] for c in result['target_drg_candidates']]
        assert '870' in drg_codes
        assert '871' in drg_codes
        assert '872' in drg_codes
        assert result['optimization_potential'] in ['HIGH', 'MEDIUM']
        assert len(result['documentation_gaps']) >= 0
        assert result['fiscal_year_context']['fiscal_year'] == 'FY2026'
        assert result['fiscal_year_context']['grouper_version'] == 'v43'
        
        print('\n���🎉 All unit test assertions PASSED')
        
except Exception as e:
    print(f'��❌ API test FAILED: {e}')
    exit(1)
