# Blackjack Simulator - Quality Assurance & Edge Case Report

**Generated on:** 2026-02-11

## Executive Summary
Following a series of rigorous edge case tests (10,000+ simulation cycles), several critical bugs were identified and resolved. The system has been hardened against invalid inputs, insufficient funds, and high-speed simulation crashes. UI enhancements were also implemented for a premium user experience.

---

## Backend & Simulation Bug Fixes

### 1. Simulation Crash during Split (Auto Mode)
*   **BUG**: The simulation encountered a `TypeError: 'Card' object is not iterable` in the `count_cards` function during high-speed split processing.
*   **FIX**: Refactored `AutoGame.count_cards` to robustly handle both `Hand` objects and raw `Card` objects, ensuring consistent counting across all game paths.

### 2. Stale True Card Count in Logs
*   **BUG**: The simulation logs were writing the True Card Count from the start of a round alongside the card count from the end of the round, creating a one-round lag.
*   **FIX**: Modified `auto.py` to recalculate the True Count immediately before logging, ensuring all metrics (balance, card count, true count) are perfectly synchronized.

### 3. Split Logic Integrity
*   **BUG**: A "Hand cannot be split" error occurred because the auto-play logic was manually managing splits while calling backend split functions simultaneously.
*   **FIX**: Rewrote the split logic in `auto.py` to be iterative. It now correctly leverages the `bj.py` `deal_split` system, supporting up to 10 split hands reliably without state conflicts.

---

## Connectivity & UI Improvements

### 4. WebSocket Disconnect (Port Mismatch)
*   **BUG**: The frontend was defaulted to port 8001 while the backend script used 8010, causing immediate "Disconnected from server" errors.
*   **FIX**: Standardized the entire application (WebSocket URL, Results Link, and Backend Uvicorn) to port **8010**.

### 5. Terminal Focus Usability
*   **BUG**: The terminal required a specific click on the input prompt line to focus, which felt clunky for a web terminal.
*   **FIX**: Implemented a click-to-focus event listener on the entire terminal container, allowing the user to click anywhere in the "black box" to focus the cursor.

---

## Edge Case Validation Results

| Test Case | Parameters | Result |
| :--- | :--- | :--- |
| **High Volume** | 10,000 Games, 1 Deck | **PASS** |
| **Over-Betting** | Bet > Balance (Force Max Bet) | **PASS** |
| **Large Shoe** | 80 Decks Initializers | **PASS** |
| **Input Validation** | 0 Games / 0 Decks rejected | **PASS** |
| **Bankruptcy** | End simulation at 0 balance | **PASS** |
| **Zero Bet** | 10,000 Games with 0 bet | **PASS** |

---

## Final Project Status: **STABLE & VERIFIED**
The application is now fully optimized for both long-term mathematical simulation and manual interactive play.
