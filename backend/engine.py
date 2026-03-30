import random
import time
from typing import List, Dict, Any, Optional


CARD_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 10, 'Q': 10, 'K': 10, 'A': 11  # Aces start at 11, adjust for soft hands
}

SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades']


def create_deck(seed: int = None) -> List[str]:
    # Generate a fresh 52-card deck, shuffled with optional seed for tests
    if seed is not None:
        random.seed(seed)
    deck = [f"{value} of {suit}" for suit in SUITS for value in CARD_VALUES.keys()]
    random.shuffle(deck)
    return deck


def hand_value(hand: List[str]) -> int:
    # Calculate hand total, treating Aces as 1 or 11 to avoid bust
    total = sum(CARD_VALUES[card.split()[0]] for card in hand)
    aces = sum(1 for card in hand if card.split()[0] == 'A')
    while total > 21 and aces:
        total -= 10
        aces -= 1
    return total


def is_bust(total: int) -> bool:
    # Quick check for bust
    return total > 21


def player_turn(deck: List[str], hand: List[str]) -> List[str]:
    # Simple player strategy: hit until >=17. (Extend with strategy table later)
    while hand_value(hand) < 17:
        hand.append(deck.pop())
    return hand


def dealer_turn(deck: List[str], hand: List[str]) -> List[str]:
    # Dealer hits on <17 (including soft 17 for this ruleset)
    while hand_value(hand) < 17:
        hand.append(deck.pop())
    return hand


def determine_outcome(player_total: int, dealer_total: int) -> str:
    # Return 'win', 'lose', or 'push'
    if player_total > 21:
        return 'lose'  # Player bust
    if dealer_total > 21:
        return 'win'  # Dealer bust
    if player_total > dealer_total:
        return 'win'
    if player_total < dealer_total:
        return 'lose'
    return 'push'


def simulate_hand(seed: int = None) -> Dict[str, Any]:
    # Simulate one full hand: deal, play, outcome
    # Returns structured data for API
    deck = create_deck(seed)

    player_cards = [deck.pop(), deck.pop()]
    dealer_cards = [deck.pop(), deck.pop()]

    player_cards = player_turn(deck, player_cards)
    player_total = hand_value(player_cards)
    dealer_total = hand_value(dealer_cards)

    if not is_bust(player_total):
        dealer_cards = dealer_turn(deck, dealer_cards)
        dealer_total = hand_value(dealer_cards)

    outcome = determine_outcome(player_total, dealer_total)

    return {
        'player_cards': player_cards,
        'dealer_cards': dealer_cards,
        'player_total': player_total,
        'dealer_total': dealer_total,
        'outcome': outcome
    }


def simulate_many(count: int, seed: Optional[int] = None, strategy: Optional[Dict] = None) -> Dict[str, Any]:
    # Simulate multiple hands using simulate_hand, aggregate stats
    # Returns aggregated stats for analysis mode

    if count < 1:
        raise ValueError("Count must be at least 1")

    wins = losses = pushes = player_busts = dealer_busts = player_blackjacks = 0
    start_time = time.time()

    current_seed = seed
    for i in range(count):
        if seed is not None:
            current_seed = seed + i  # Increment to avoid identical hands

        result = simulate_hand(seed=current_seed)

        outcome = result['outcome']
        player_total = result['player_total']
        dealer_total = result['dealer_total']

        if outcome == 'win':
            wins += 1
        elif outcome == 'lose':
            losses += 1
        else:
            pushes += 1

        if player_total > 21:
            player_busts += 1
        if dealer_total > 21:
            dealer_busts += 1
        if len(result['player_cards']) == 2 and player_total == 21:
            player_blackjacks += 1

    total_hands = count
    win_rate = (wins / total_hands) * 100 if total_hands else 0
    house_edge = ((losses - wins) / total_hands) * 100 if total_hands else 0  # Simplified

    elapsed = time.time() - start_time

    return {
        'total_hands': total_hands,
        'wins': wins,
        'losses': losses,
        'pushes': pushes,
        'win_rate': round(win_rate, 2),
        'house_edge': round(house_edge, 2),
        'player_busts': player_busts,
        'dealer_busts': dealer_busts,
        'player_blackjacks': player_blackjacks,
        'elapsed_seconds': round(elapsed, 2)
    }