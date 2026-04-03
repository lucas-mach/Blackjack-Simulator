import urllib.request
import json

BASE = 'http://localhost:8000'

def get(path):
    with urllib.request.urlopen(BASE + path) as r:
        return r.status, json.loads(r.read())

def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(BASE + path, data=data,
                                  headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req) as r:
        return r.status, json.loads(r.read())

print('=== API Test 1: GET /strategy/tcc_0_1 ===')
status, d = get('/strategy/tcc_0_1')
print('  Status:', status)
assert status == 200
assert 'hard' in d and 'soft' in d and 'split' in d
assert len(d['hard']) == 18 and len(d['hard'][0]) == 10
assert d['col_labels'] == ['2','3','4','5','6','7','8','9','10','A']
print('  Hard shape:', len(d['hard']), 'x', len(d['hard'][0]))
print('  H12 vs 2:', d['hard'][8][0])
print('  PASS\n')

print('=== API Test 2: GET /strategy/bad_key => 404 ===')
try:
    get('/strategy/bad_key')
    assert False, 'Should have raised'
except urllib.error.HTTPError as e:
    assert e.code == 404, 'Expected 404, got ' + str(e.code)
print('  PASS\n')

print('=== API Test 3: POST /simulate with custom bet_ramp ===')
status, data = post('/simulate', {
    'num_games': 50, 'balance': 1000, 'bet_amount': 10, 'num_decks': 8,
    'bet_ramp': [2, 2, 2, 2, 2, 2, 2]
})
assert status == 200
bets = [x['bet'] for x in data['results']]
print('  Unique bet sizes:', set(bets))
assert all(b >= 20 for b in bets), 'Flat 2x ramp not applied'
print('  PASS\n')

print('=== API Test 4: POST /simulate with strategy_overrides ===')
status, data = post('/simulate', {
    'num_games': 20, 'balance': 1000, 'bet_amount': 10, 'num_decks': 8,
    'strategy_overrides': {'tcc_0_1': {'hard': [[8, 0, 'S']], 'soft': [], 'split': []}}
})
assert status == 200
print('  Ran', len(data['results']), 'hands.  PASS\n')

print('=== API Test 5: POST /simulate with insurance_threshold ===')
status, data = post('/simulate', {
    'num_games': 100, 'balance': 1000, 'bet_amount': 10, 'num_decks': 8,
    'insurance_threshold': 0
})
assert status == 200
print('  Ran', len(data['results']), 'hands.  PASS\n')

print('=== All API tests PASSED ===')
