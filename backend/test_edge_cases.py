import sys
sys.path.insert(0, '.')
from auto import AutoGame

print('=== Edge Case Test 1: Empty strategy_overrides => base strategy ===')
# {} passed explicitly = user has editor open but no rows → must use tcc_0_1
result = AutoGame.auto_play_loop(
    num_games=30, balance=1000, bet_amount=10,
    strategy_overrides={},   # empty, not None
    return_as_json=True,
    input_func=lambda *a, **k: None,
    output_func=lambda *a, **k: None,
)
assert len(result['results']) > 0, 'No results'
print('  Ran', len(result['results']), 'hands with empty overrides (no crash). PASS\n')

print('=== Edge Case Test 2: TCC -3 with only tcc_8plus + tcc_0_1 defined ===')
# Closest strategy to TCC -3:
#   tcc_0_1 threshold = 0  (distance 3)
#   tcc_8plus threshold = 8 (distance 11)
# → should use tcc_0_1

# We verify by spiking tcc_0_1 H13 vs 2 = 'D' (unusual), tcc_8plus = 'S'
# Then running at a very negative count and checking we get the tcc_0_1 run
base_strat = AutoGame.Strategy('strategies/strategy_tcc_0_1.xlsx')
high_strat = AutoGame.Strategy('strategies/strategy_tcc_8plus.xlsx')
print('  H13 vs 2  tcc_0_1:', base_strat.hard_df.iat[9, 0])
print('  H13 vs 2  tcc_8plus:', high_strat.hard_df.iat[9, 0])

# The resolver is what we're testing - call it directly
from auto import _resolve_strategy_key
TCC_KEY_TO_PATH = {
    'tcc_8plus':      'strategies/strategy_tcc_8plus.xlsx',
    'tcc_0_1':        'strategies/strategy_tcc_0_1.xlsx',
}
overrides = {'tcc_8plus': {}, 'tcc_0_1': {}}

resolved = _resolve_strategy_key(-3, overrides, TCC_KEY_TO_PATH)
print('  TCC=-3 resolved to:', resolved)
assert 'tcc_0_1' in resolved, f'Expected tcc_0_1, got {resolved}'
print('  PASS\n')

print('=== Edge Case Test 3: TCC 5 with only tcc_8plus defined ===')
# All defined TCCs are above 5 → use the lowest (floor) = tcc_8plus
overrides_high_only = {'tcc_8plus': {}}
resolved = _resolve_strategy_key(5, overrides_high_only, TCC_KEY_TO_PATH)
print('  TCC=5 resolved to:', resolved)
assert 'tcc_8plus' in resolved, f'Expected tcc_8plus, got {resolved}'
print('  PASS\n')

print('=== Edge Case Test 4: TCC 9 with tcc_0_1 + tcc_8plus → tcc_8plus wins ===')
overrides_both = {'tcc_8plus': {}, 'tcc_0_1': {}}
resolved = _resolve_strategy_key(9, overrides_both, TCC_KEY_TO_PATH)
print('  TCC=9 resolved to:', resolved)
assert 'tcc_8plus' in resolved, f'Expected tcc_8plus, got {resolved}'
print('  PASS\n')

print('=== All edge case tests PASSED ===')
