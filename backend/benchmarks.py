import time
from statistics import mean
from auto import AutoGame


def run_single_benchmark(num_games, bet_amount=10, balance=1000, num_decks=8):
    start = time.perf_counter()

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


def benchmark_suite():
    hand_counts = [1000, 5000, 10000, 25000]
    repeats = 3

    print("\nBlackjack Simulator Benchmark Results")
    print("-" * 60)
    print(f"{'Hands':>10} {'Run':>6} {'Time (s)':>12} {'Hands/sec':>12}")
    print("-" * 60)

    summary = []

    for hands in hand_counts:
        times = []
        throughputs = []

        for run in range(1, repeats + 1):
            elapsed, hps = run_single_benchmark(num_games=hands)
            times.append(elapsed)
            throughputs.append(hps)

            print(f"{hands:>10} {run:>6} {elapsed:>12.4f} {hps:>12.2f}")

        avg_time = mean(times)
        avg_hps = mean(throughputs)
        summary.append((hands, avg_time, avg_hps))

    print("\nAverage Results")
    print("-" * 60)
    print(f"{'Hands':>10} {'Avg Time (s)':>15} {'Avg Hands/sec':>18}")
    print("-" * 60)

    for hands, avg_time, avg_hps in summary:
        print(f"{hands:>10} {avg_time:>15.4f} {avg_hps:>18.2f}")


if __name__ == "__main__":
    benchmark_suite()

