from dataclasses import dataclass, field

@dataclass
class RuleSet:
    """Configurable house rules for Blackjack.

    blackjack_payout: '3:2' | '6:5' | '1:1'
    max_splits: 1..4
    double_on: 'any' | '10_11'  (any 2 cards vs only 10 or 11)
    double_after_split: bool
    dealer_hits_soft_17: bool
    split_aces: 'play_no_resplit' | 'no_play' | 'same'
    surrender_allowed: bool
    insurance_allowed: bool
    """
    blackjack_payout: str = '3:2'
    max_splits: int = 4
    double_on: str = 'any'
    double_after_split: bool = True
    dealer_hits_soft_17: bool = False
    split_aces: str = 'no_play'
    surrender_allowed: bool = False
    insurance_allowed: bool = True

class Card:
    def __init__(self, rank, suit):
        self.rank = rank
        self.suit = suit

    def get_value(self):
        if self.rank in ['J', 'Q', 'K']:
            return 10
        elif self.rank == 'A':
            return 11  # Initially consider Ace as 11
        else:
            return int(self.rank)
class Deck:
    def __init__(self, num_decks=1):
        self.cards = []
        self.games = []  # List to track all active games
        suits = ["♤", "♡", "♧", "♢"]
        ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
        #ranks = ['3','3','3','3','3','3','3','3','3','3','3','3','3','3','3','3'] #testing
        #ranks = ['A', '10'] #testing
        for i in range(num_decks):
            for suit in suits:
                for rank in ranks:
                    self.cards.append(Card(rank, suit))
    
    def shuffle(self):
        import random
        random.shuffle(self.cards)
    
    def deal_card(self):
        if not self.cards:
            raise IndexError("Deck is empty - cannot deal a card")
        return self.cards.pop()
        
    def new_game(self):
        """Create a new game and add it to the deck's games"""
        game = Game(self)
        self.games.append(game)
        return game
        
    def remove_game(self, game):
        """Remove a completed game from the deck's games"""
        if game in self.games:
            self.games.remove(game)
            
class Game:
    def __init__(self, deck):
        self.deck = deck  # Store reference to the parent deck
        # Start each game with one player hand by default
        self.player_hands = [PlayerHand()]
        self.dealer_hand = DealerHand()

    def new_hand(self):
        """Add a new player hand to this game and return its index."""
        ph = PlayerHand()
        self.player_hands.append(ph)
        return len(self.player_hands) - 1
        
    def deal_initial(self, handnum=0):
        """Deal initial two cards to the specified player hand and dealer.
        If the player hand does not exist yet, create it."""
        # ensure the requested hand exists
        while handnum >= len(self.player_hands):
            self.new_hand()
        for _ in range(2):
            self.player_hands[handnum].draw_card(self.deck.deal_card())
            self.dealer_hand.draw_card(self.deck.deal_card())
            
            
    def deal_split(self, handnum):
        """Perform a split on the specified hand number.
        Moves one card from the original hand into a new hand and deals
        one additional card to each hand."""
        if handnum < 0 or handnum >= len(self.player_hands):
            raise IndexError("Invalid hand number to split")
        original = self.player_hands[handnum]
        if not original.can_split():
            raise ValueError("Hand cannot be split")
        # take the second card to form the new hand
        card_to_move = original.cards.pop()
        new_hand = PlayerHand()
        new_hand.draw_card(card_to_move)
        # deal one new card to each hand
        original.draw_card(self.deck.deal_card())
        new_hand.draw_card(self.deck.deal_card())
        # append the new hand after the original
        self.player_hands.insert(handnum + 1, new_hand)

    def player_hit(self, handnum=0):
        if handnum < 0 or handnum >= len(self.player_hands):
            raise IndexError("Invalid hand number to hit")
        self.player_hands[handnum].draw_card(self.deck.deal_card())

    def dealer_play(self, Auto=True, output_func=None, rules=None):
        if not Auto and output_func:
            output_func("Dealer's Hand:", self.dealer_hand.get_cards(), ": ", self.dealer_hand.get_value())
        while self.dealer_hand.should_hit(rules=rules):
            self.dealer_hand.draw_card(self.deck.deal_card())
            if not Auto and output_func:
                output_func("Dealer's Hand:", self.dealer_hand.get_cards(), ": ", self.dealer_hand.get_value())

    def end_game(self):
        """Clean up the game when it's done"""
        self.deck.remove_game(self)

    def get_winner(self, handnum=0, rules=None):
        if self.player_hands[handnum].is_busted():
            return "L"
        elif self.dealer_hand.is_busted():
            return "W"
        elif self.player_hands[handnum].get_value() > self.dealer_hand.get_value():
            return "W"
        elif self.player_hands[handnum].get_value() < self.dealer_hand.get_value():
            return "L"
        else:
            return "P"
    def interpret_result(result, bj_payout='3:2'):
        """Returns net profit/loss from any result structure.
        bj_payout: '3:2' | '6:5' | '1:1' — only applies to W! (blackjack) outcomes.
        """
        if isinstance(result, tuple):
            outcome, bet, count = result
            if outcome not in ['W', 'W!', 'L', 'P', 'R', 'E']:
                raise ValueError("Invalid outcome")
            if outcome == 'W!':
                if bj_payout == '6:5':
                    multiplier = 1.2
                elif bj_payout == '1:1':
                    multiplier = 1.0
                else:  # default 3:2
                    multiplier = 1.5
                return bet * multiplier
            elif outcome == 'W':
                return bet
            elif outcome == 'L':
                return -bet
            elif outcome == 'R':  # surrender
                return -bet * 0.5
            else:  # P, E
                return 0
        return sum(Game.interpret_result(r, bj_payout) for r in result) if isinstance(result, list) else 0
    def interpret_card_count(result):
        """Returns card count from any result structure"""
        if isinstance(result, tuple):
            _, _, count = result
            return count
        return sum(Game.interpret_card_count(r) for r in result) if isinstance(result, list) else 0
class PlayerHand:
    def __init__(self):
        self.cards = []
    def clear(self):
        self.cards = []
    def draw_card(self, card):
        self.cards.append(card)
    def num_cards(self):
        # Return the number of cards in the hand
        return len(self.cards)
    def get_cards(self):
        output = ""
        for card in self.cards:
            output += f"{card.rank} of {card.suit} "
        return output.strip()
    def get_cards_structured(self):
        # Map suit symbols to names for the frontend filenames
        suit_map = {'♤': 'Spades', '♡': 'Hearts', '♧': 'Clubs', '♢': 'Diamonds'}
        out = []
        for card in self.cards:
            suit_raw = card.suit
            suit_name = suit_map.get(suit_raw, str(suit_raw))
            out.append({'rank': card.rank, 'suit': suit_name})
        return out
    def show_cards(self):
        print(self.get_cards())
    def can_split(self):
        return len(self.cards) == 2 and self.cards[0].rank == self.cards[1].rank
    
    def _evaluate(self):
        total = 0
        aces = 0
        for card in self.cards:
            v = card.get_value()  # Ace returns 11 here
            total += v
            if card.rank == 'A':
                aces += 1

        # Correct threshold: only reduce if busting
        while total > 21 and aces:
            total -= 10
            aces -= 1

        soft = aces > 0  # at least one Ace still counted as 11
        return total, soft

    def get_value(self):
        total, _ = self._evaluate()
        return total

    def has_soft_ace(self):
        _, soft = self._evaluate()
        return soft


    def blackjack(self):
        ten = any(card.get_value() == 10 for card in self.cards)
        return 'A' in [card.rank for card in self.cards] and ten and len(self.cards) == 2
    
    def is_busted(self):
        return self.get_value() > 21  
    
class DealerHand(PlayerHand):
    def should_hit(self, rules=None):
        v = self.get_value()
        if v < 17:
            return True
        if v == 17 and rules and getattr(rules, 'dealer_hits_soft_17', False) and self.has_soft_ace():
            return True
        return False
    def get_card_shown(self):
        if not self.cards:
            return ""
        output = f"{self.cards[0].rank} of {self.cards[0].suit}"
        return output
    def get_card_shown_value(self):
        return self.cards[0].get_value()