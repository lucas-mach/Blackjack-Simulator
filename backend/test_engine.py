from engine import simulate_hand, simulate_many

# Run once with no seed (random)
result = simulate_hand()
print("Random hand:")
print(result)

# Run with seed for reproducibility
result_seeded = simulate_hand(seed=123)
print("\nSeeded hand (should be same every time):")
print(result_seeded)

# Test simulate_many basics
many_result = simulate_many(10, seed=42)
print("\nBatch of 10 (seeded):")
print(many_result)
assert many_result['total_hands'] == 10
assert many_result['wins'] + many_result['losses'] + many_result['pushes'] == 10
assert 0 <= many_result['win_rate'] <= 100

# Edge: count=1 should match simulate_hand
single_many = simulate_many(1, seed=42)
single_hand = simulate_hand(seed=42)
assert single_many['wins'] == (1 if single_hand['outcome'] == 'win' else 0)
assert single_many['player_blackjacks'] == (1 if len(single_hand['player_cards']) == 2 and single_hand['player_total'] == 21 else 0)

# Edge: invalid count
try:
    simulate_many(0)
    assert False, "Should raise ValueError"
except ValueError:
    pass