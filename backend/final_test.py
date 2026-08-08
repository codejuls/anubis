import json
from urllib.request import Request, urlopen

# Test sepsis case
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

print('Testing API endpoint...')
try:
    req = Request(
        'http://localhost:8000/api/optimize',
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urlopen(req, timeout=5) as response:
        result = json.loads(response.read().decode())
        print('������������������������ API Test PASSED - Status: {}'.format(response.status))
        print('Optimization potential: {}'.format(result["optimization_potential"]))
        print('Current reimbursement: ${:.2f}'.format(result["current_reimbursement"]))
        print('Target DRG candidates: {}'.format(len(result["target_drg_candidates"])))
        for c in result['target_drg_candidates']:
            print('  DRG {}: ${:+.2f} (prob: {})'.format(c["drg_code"], c["reimbursement_delta"], c["probability"]))
        print('Query worthiness: {}/10'.format(result["query_worthiness_score"]))
except Exception as e:
    print('������������������������ API test failed: {}'.format(e))
    print('This is expected if the server is not running')
