import pandas as pd
import numpy as np
import warnings
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

warnings.filterwarnings("ignore")

BG       = "#0a0a0a"
PANEL_BG = "#0d0d0d"
GRID     = "#1a1a1a"
BORDER   = "#2a2a2a"
TEXT_DIM = "#555555"
TEXT_MED = "#888888"
TEXT_HI  = "#cccccc"
FONT     = "monospace"


class SimGraph:
    """
    Reads results.csv and produces a clean, minimal terminal-style chart:
      • Balance  — white step line
      • True Card Count — blue line, right y-axis
      • y=0 reference lines for both axes
      • Vertical dashed marks at each shuffle reset
    """

    def __init__(self, csv_path="results.csv", output_path="simulation_graph.png"):
        self.csv_path   = csv_path
        self.output_path = output_path

    def generate(self):
        df            = self._load(self.csv_path)
        shuffle_hands = self._detect_shuffles(df)
        self._plot(df, shuffle_hands)
        print(f"[SimGraph] Graph saved to: {self.output_path}")

    @staticmethod
    def _load(path):
        df = pd.read_csv(path)
        df.columns = [c.strip() for c in df.columns]
        df["hand"] = df["hand"].astype(int)
        return df

    @staticmethod
    def _detect_shuffles(df):
        shuffles, cc, hands = [], df["card_count"].values, df["hand"].values
        for i in range(1, len(cc)):
            if abs(cc[i]) <= 2 and abs(cc[i - 1]) > 5:
                shuffles.append(int(hands[i]))
        return shuffles

    def _plot(self, df, shuffle_hands):
        hands   = df["hand"].values
        balance = df["balance"].values
        tcc     = df["true_count"].values
        start   = balance[0]
        profit  = balance[-1] - start

        fig = plt.figure(figsize=(18, 7), facecolor=BG)
        ax  = fig.add_axes([0.06, 0.14, 0.86, 0.72], facecolor=PANEL_BG)
        ax2 = ax.twinx()

        # ── spines ──────────────────────────────────────────────────────────
        for a in (ax, ax2):
            for sp in a.spines.values():
                sp.set_edgecolor(BORDER)
                sp.set_linewidth(0.7)
            a.tick_params(colors=TEXT_MED, labelsize=7,
                          direction="in", length=3, which="both")

        # ── grid ────────────────────────────────────────────────────────────
        ax.set_axisbelow(True)
        ax.grid(axis="y", color=GRID, linewidth=0.5)
        ax.grid(axis="x", color=GRID, linewidth=0.3, linestyle=":")

        # ── y=0 reference lines ─────────────────────────────────────────────
        ax.axhline(start, color="#333333", linewidth=0.7, linestyle="--", zorder=2)
        ax2.axhline(0,    color="#333333", linewidth=0.7, linestyle="--", zorder=2)

        # ── balance (white step) ─────────────────────────────────────────────
        ax.step(hands, balance, where="post",
                color="#e0e0e0", linewidth=1.3, zorder=4)

        # ── true card count — vertical bars from y=0 ────────────────────────
        ax2.vlines(hands, 0, tcc,
                   color="#3a7bd5", linewidth=0.8, zorder=3, alpha=0.75)

        # ── shuffle rulers ───────────────────────────────────────────────────
        for sh in shuffle_hands:
            ax.axvline(sh, color="#333333", linewidth=0.7,
                       linestyle="--", zorder=5)

        # ── axis labels ──────────────────────────────────────────────────────
        ax.set_xlabel("HAND", fontfamily=FONT, fontsize=8,
                      color=TEXT_MED, labelpad=5)
        ax.set_ylabel("BALANCE  ($)", fontfamily=FONT, fontsize=8,
                      color=TEXT_HI, labelpad=6)
        ax2.set_ylabel("TRUE  CARD  COUNT", fontfamily=FONT, fontsize=8,
                       color="#3a7bd5", labelpad=8, rotation=270, va="bottom")

        ax.yaxis.set_major_formatter(
            mticker.FuncFormatter(lambda v, _: f"${v:,.0f}"))
        ax2.yaxis.set_major_formatter(
            mticker.FuncFormatter(lambda v, _: f"{v:+.1f}"))

        # ── title ────────────────────────────────────────────────────────────
        fig.text(0.06, 0.91, "BLACKJACK  SIMULATION  PROBE",
                 fontfamily=FONT, fontsize=13, fontweight="bold",
                 color="#ffffff", va="bottom")
        fig.text(0.06, 0.88,
                 f"HANDS: {len(df)}   |   "
                 f"SHUFFLES: {len(shuffle_hands)}   |   "
                 f"P/L: {'+'if profit>=0 else ''}{profit:,.0f}",
                 fontfamily=FONT, fontsize=7.5, color=TEXT_MED, va="bottom")

        # ── status bar ───────────────────────────────────────────────────────
        fig.text(0.06, 0.05, "BUFFER_PROGRESS: 100%",
                 fontfamily=FONT, fontsize=7, color=TEXT_DIM)
        fig.text(0.76, 0.05, "MODE: SIM_PROC_001",
                 fontfamily=FONT, fontsize=7, color=TEXT_DIM)

        plt.savefig(self.output_path, dpi=180, bbox_inches="tight",
                    facecolor=BG, edgecolor="none")
        plt.close(fig)


if __name__ == "__main__":
    SimGraph().generate()
