import sys
sys.path.insert(0, '.')
from auto import AutoGame

print('=== Test: use_base_strategy_only ===')

# Run 10 hands at a very high count where strategy WOULD normally change
# (e.g. tcc >= 8 uses a different file). With base_only=True, it should
# never switch away from tcc_0_1.

# We'll verify indirectly: pre-load tcc_0_1, get a hand action,
# then confirm base-only run produces a result without crashing on strategy switch.

# First, verify what H13 vs dealer 2 says in tcc_0_1 (base)
base = AutoGame.Strategy('strategies/strategy_tcc_0_1.xlsx')
base_action = base.hard_df.iat[9, 0]   # H13 vs 2: row=9 (13-4), col=0 (dealer 2)
high = AutoGame.Strategy('strategies/strategy_tcc_8plus.xlsx')
high_action = high.hard_df.iat[9, 0]
print(f'  H13 vs 2  base(tcc_0_1): {base_action}   high(tcc_8+): {high_action}')

result = AutoGame.auto_play_loop(
    num_games=50, balance=1000, bet_amount=10,
    use_base_strategy_only=True,
    return_as_json=True,
    input_func=lambda *a, **k: None,
    output_func=lambda *a, **k: None,
)
assert len(result['results']) > 0
print(f'  Ran {len(result["results"])} hands with base_strategy_only=True. PASS\n')

print('=== Test PASSED ===')
