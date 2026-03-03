from auto import AutoGame

print("Starting run")
df = AutoGame.auto_play_loop(bet_amount=1, num_games=5, balance=100, num_decks=1, return_as_json=False)
print(df)
import os
print("CSV exists?", os.path.exists('results.csv'))
print(df.head())
