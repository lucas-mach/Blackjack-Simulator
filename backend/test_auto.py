from auto import AutoGame   # ← only need this now

# Test console-style (old behavior)
print("=== Console-style run ===")
AutoGame.auto_play_loop(           # ← call it on the class
    bet_amount=1,
    num_games=8,
    balance=1000,
    num_decks=2,
    input_func=input,
    output_func=print
    # Note: no return_as_json here → defaults to False
)

# Test JSON mode
print("\n=== JSON mode run ===")
result = AutoGame.auto_play_loop(  # ← again, on the class
    bet_amount=1,
    num_games=8,
    balance=1000,
    num_decks=2,
    input_func=lambda *a, **k: None,
    output_func=lambda *a, **k: None,
    return_as_json=True
)

# The rest stays the same
print("Returned keys:", list(result.keys()))
print("Number of hands in results:", len(result.get("results", [])))
print("Final balance:", result.get("final_balance"))
print("Total profit:", result.get("total_profit"))
print("Sample hand (first one):", result["results"][0] if "results" in result and result["results"] else "none")