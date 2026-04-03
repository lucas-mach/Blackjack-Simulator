import sys
sys.path.insert(0, '.')
from auto import AutoGame

print('=== Test 1: apply_overrides (non-destructive cell patch) ===')
s = AutoGame.Strategy('strategies/strategy_tcc_0_1.xlsx')
orig = s.hard_df.iat[8, 0]  # H12 vs dealer 2
print(f'  H12 vs 2 (original): {orig}')
s2 = s.apply_overrides({'hard': [[8, 0, 'S']]})
after = s2.hard_df.iat[8, 0]
print(f'  H12 vs 2 (overridden): {after}')
assert after == 'S', f'Override failed: got {after}'
assert s.hard_df.iat[8, 0] == orig, 'Original was mutated!'
print('  PASS\n')

print('=== Test 2: Custom bet_ramp (flat 2x) ===')
flat_ramp = [2, 2, 2, 2, 2, 2, 2]
result = AutoGame.auto_play_loop(
    num_games=20, balance=1000, bet_amount=10,
    bet_ramp=flat_ramp, return_as_json=True,
    input_func=lambda *a, **k: None,
    output_func=lambda *a, **k: None,
)
bets = [r['bet'] for r in result['results']]
unique_bets = set(bets)
print(f'  Unique bet sizes seen: {unique_bets}  (expect multiples of 20)')
# Each hand bet >= 20 (10 base * 2x mult), may double
assert all(b >= 20 for b in bets), f'Unexpected bet: {bets}'
print('  PASS\n')

print('=== Test 3: strategy_overrides passed through ===')
overrides = {'tcc_0_1': {'hard': [[8, 0, 'S']], 'soft': [], 'split': []}}
result = AutoGame.auto_play_loop(
    num_games=5, balance=1000, bet_amount=10,
    strategy_overrides=overrides, return_as_json=True,
    input_func=lambda *a, **k: None,
    output_func=lambda *a, **k: None,
)
assert len(result['results']) > 0, 'No results'
print(f'  Ran {len(result["results"])} hands with strategy override. PASS\n')

print('=== Test 4: insurance_threshold (TCC >= 0, always fires) ===')
result = AutoGame.auto_play_loop(
    num_games=200, balance=1000, bet_amount=10,
    insurance_threshold=0,
    return_as_json=True,
    input_func=lambda *a, **k: None,
    output_func=lambda *a, **k: None,
)
assert len(result['results']) > 0, 'No results with insurance'
print(f'  Completed {len(result["results"])} hands. PASS\n')

print('=== All backend tests PASSED ===')
