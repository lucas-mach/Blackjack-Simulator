from engine import simulate_hand

# Run once with no seed (random)
result = simulate_hand()
print("Random hand:")
print(result)

# Run with seed for reproducibility
result_seeded = simulate_hand(seed=123)
print("\nSeeded hand (should be same every time):")
print(result_seeded)