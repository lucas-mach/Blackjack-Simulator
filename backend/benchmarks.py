import time
from statistics import mean
from auto import AutoGame


def run_single_benchmark(num_games, bet_amount=10, balance=1000, num_decks=8):

    # starts timer
    start = time.perf_counter()

    # input/output prevents bug due to lack of user input
    AutoGame.auto_play_loop(
        bet_amount=bet_amount,
        num_games=num_games,
        balance=balance,
        num_decks=num_decks,
        input_func=lambda *args, **kwargs: "",
        output_func=lambda *args, **kwargs: None,
    )

    end = time.perf_counter()
    elapsed = end - start
    hands_per_second = num_games / elapsed if elapsed > 0 else 0

    return elapsed, hands_per_second

# runs the above function over different hands counts and prints results in a table 
def benchmark_suite():
    hand_counts = [1000, 5000, 10000, 25000]

    print("\nBlackjack Simulator Benchmark Results")
    print("-" * 48)
    print(f"{'Hands':>10} {'Run':>6} {'Time (s)':>12} {'Hands/sec':>12}")
    print("-" * 48)

    summary = []

    for hands in hand_counts:
        times = []
        # hands per second
        throughputs = []

        # runs each benchmark 3 times and averages results
        for run in range(1, 4):
            elapsed, hps = run_single_benchmark(num_games=hands)
            times.append(elapsed)
            throughputs.append(hps)

            print(f"{hands:>10} {run:>6} {elapsed:>12.4f} {hps:>12.2f}")

        avg_time = mean(times)
        avg_hps = mean(throughputs)
        summary.append((hands, avg_time, avg_hps))

    print("\nAverages")
    print("-" * 48)
    print(f"{'Hands':>10} {'Avg Time (s)':>15} {'Avg Hands/sec':>18}")
    print("-" * 48)

    for hands, avg_time, avg_hps in summary:
        print(f"{hands:>10} {avg_time:>15.4f} {avg_hps:>18.2f}")

# only run benchmarks if the file is executed directly
if __name__ == "__main__":
    benchmark_suite()

