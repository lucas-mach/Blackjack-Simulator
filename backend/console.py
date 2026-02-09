from bj import Game, PlayerHand, DealerHand, Deck, Card
class ConsoleGame:
    MAX_SPLITS = 4

    def count_cards(hands):
        """Return Hi-Lo count for a collection of hands.

        Rules: 2-6 => +1, 10/J/Q/K/A => -1, all others => 0.
        `hands` may be an iterable of PlayerHand objects or iterables of card-like objects.
        """
        total = 0
        for hand in hands:
            # support both PlayerHand objects (with .cards) and plain iterables
            cards = getattr(hand, 'cards', hand)
            for c in cards:
                rank = getattr(c, 'rank', c)
                r = str(rank)
                if r in ('2', '3', '4', '5', '6'):
                    total += 1
                elif r in ('10', 'J', 'Q', 'K', 'A'):
                    total -= 1
        return total
    
    def console_play(balance = 1000):
        deck = Deck(num_decks=8)
        card_count = 0
        deck.shuffle()
        # Game loop
        while True:
            # Create a new game from the deck
            bet = -1
            while bet < 0:
                try:
                    print("Current Balance:", balance)
                    bet = int(input("Enter bet: ").strip().lower())
                    if(bet < 0):
                        print("Bet must be non-negative. Try again.")
                    if bet > balance:
                        print("Insufficient balance. Try again.")
                        bet = -1
                except ValueError:
                    print("Invalid input. Please enter a valid bet amount.")
                    continue
                
            game = deck.new_game()
            
            # Play the round
            round_result = ConsoleGame.played_hand(game, bet, balance)
            if round_result[0] == 'W' or round_result[0] == 'W!' :
                print("Round Result: Win")
            elif round_result[0] == 'L' :
                print("Round Result: Loss")
            elif round_result[0] == 'P' :
                print("Round Result: Push")
            elif isinstance(round_result, list) and len(round_result) > 1:
                print("Round Result: Split Hands")
                print("Hands Results:")
                for res in round_result:
                    if res[0] == 'W' or res[0] == 'W!' :
                        print("Win")
                    elif res[0] == 'L' :
                        print("Loss")
                    elif res[0] == 'P' :
                        print("Push")
            card_count += ConsoleGame.interpret_count_from_result(round_result)
            true_count = card_count / (len(deck.cards)/52) if len(deck.cards) > 0 else 0
            print("Card Count: ", card_count)
            print("True Count: ", round(true_count, 2))
            print("Profit/Loss:", Game.interpret_result(round_result))
            balance += Game.interpret_result(round_result)
            # Clean up the game
            game.end_game()
            
            # Check if deck needs reshuffling (e.g., if less than 25% of cards remain)
            if len(deck.cards) < (52 * 8 * 0.25):  # Less than 25% of cards remain
                print("Reshuffling deck...")
                deck = Deck(num_decks=8)
                deck.shuffle()


    def interpret_count_from_result(result):
        """Helper to extract counts from result structures."""
        if isinstance(result, tuple):
            return result[2] if len(result) > 2 else 0
        if isinstance(result, list):
            return sum(ConsoleGame.interpret_count_from_result(r) for r in result)
        return 0


    def played_hand_split(game, bet_amount, handnum=0, balance=0, family_for_hand=None, family_splits=None, max_splits=MAX_SPLITS):
        """
        Play ONLY the player's actions for a single hand index and return (final_hand_obj, bet_amount).
        This will allow performing additional splits on this hand (updates family_for_hand and family_splits),
        but it will NOT automatically play any newly created sibling hands — caller must iterate over them.
        """
        if handnum < 0 or handnum >= len(game.player_hands):
            raise IndexError("Invalid hand number for split play")
        if family_for_hand is None or family_splits is None:
            raise RuntimeError("family_for_hand and family_splits must be provided")

        hand = game.player_hands[handnum]
        family_id = family_for_hand.get(hand, None)
        if family_id is None:
            # If this hand wasn't previously tracked, start a new family for it
            family_id = max(list(family_splits.keys()) + [-1]) + 1
            family_for_hand[hand] = family_id
            family_splits[family_id] = 0

        while not hand.is_busted():
            # Auto-stop at 21
            if hand.get_value() == 21:
                print("Player's Hand:", hand.get_cards())
                print("21: no more action")
                break

            # Display current hand state
            if hand.has_soft_ace():
                msg = f"{hand.get_value() - 10}, {hand.get_value()}"
            else:
                msg = f"{hand.get_value()}"
            print("Player's Hand:", hand.get_cards(), "\nValue:", msg)

            # Prompt for action
            print("Choose your Action")
            print("h: Hit")
            print("s: Stand")
            if hand.num_cards() == 2:
                print("d: Double Down")
            if hand.can_split() and family_splits.get(family_id, 0) < max_splits:
                print("v: Split")
            action = input().strip().lower()

            if action == 'h':
                game.player_hit(handnum=handnum)
                hand = game.player_hands[handnum]
                if hand.is_busted():
                    break
                continue

            elif action == 's':
                break

            elif action == 'd' and hand.num_cards() == 2 and balance >= bet_amount:
                game.player_hit(handnum=handnum)
                bet_amount *= 2
                hand = game.player_hands[handnum]
                # After a double, stand automatically
                break

            elif action == 'v' and hand.can_split() and family_splits.get(family_id, 0) < max_splits:
                # perform split on this hand index
                game.deal_split(handnum)
                # the new hand will be at handnum+1
                if handnum + 1 < len(game.player_hands):
                    new_hand = game.player_hands[handnum + 1]
                    family_for_hand[new_hand] = family_id
                    # increment family split count
                    family_splits[family_id] = family_splits.get(family_id, 0) + 1
                # continue playing the current hand (the dealer/new cards already assigned by deal_split)
                hand = game.player_hands[handnum]
                continue

            else:
                if action == 'v':
                    if not hand.can_split():
                        print("Invalid action: Hand cannot be split (cards do not match or not two cards).")
                    elif family_splits.get(family_id, 0) >= max_splits:
                        print("Invalid action: Maximum splits reached for this hand.")
                    elif balance < bet_amount:
                        print("Invalid action: Insufficient balance to place additional bet for split.")
                    else:
                        print("Invalid action: Split not permitted in current state.")
                elif action == 'd':
                    if hand.num_cards() != 2:
                        print("Invalid action: Double down allowed only on initial two-card hands.")
                    elif balance < bet_amount:
                        print("Invalid action: Insufficient balance to double down.")
                    else:
                        print("Invalid action: Double down not permitted in current state.")
                elif action in ('h', 's'):
                    # these branches should have been handled above; provide a safe fallback
                    print("Invalid action: Unable to perform that action right now.")
                else:
                    print("Invalid action: Valid actions are h (hit), s (stand), d (double), v (split).")

        return (game.player_hands[handnum], bet_amount)



    def played_hand(game, bet_amount, balance):
        """
        Main hand flow. Uses game.player_hands as a list where the first hand is index 0.
        Supports splitting up to MAX_SPLITS times per family (family of hands originating from the same seed).
        """
        # Initialize a fresh hand slot before dealing (kept for compatibility with existing flow)
        game.new_hand()

        # Prepare family tracking structures
        family_for_hand = {}
        family_splits = {}

        # Assign initial family ids for any existing hands
        for idx, h in enumerate(game.player_hands):
            fid = idx  # simple unique id per starting hand
            family_for_hand[h] = fid
            family_splits[fid] = 0

        dealer_hand = game.dealer_hand
        game.deal_initial()
        player_hand = game.player_hands[0]

        while not player_hand.is_busted():
            print("Dealer's Hand:", dealer_hand.get_card_shown())
            if player_hand.has_soft_ace():
                msg = f"{player_hand.get_value() - 10}, {player_hand.get_value()}"
            else:
                msg = f"{player_hand.get_value()}"
            print("Player's Hand:", player_hand.get_cards(), "\nValue:", msg)
            if player_hand.blackjack():
                dealer_hand.show_cards()
                if dealer_hand.blackjack():
                    print("Push!")
                    return ("P", bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))
                print("Blackjack! You win!")
                return ("W!", bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))

            if dealer_hand.blackjack():
                print("Dealer has Blackjack! You lose!")
                dealer_hand.show_cards()
                return ("L", bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))

            if player_hand.get_value() == 21:
                print("21: no more action")
                action = 's'
            else:
                print("Choose your Action")
                print("h: Hit")
                print("s: Stand")
                if player_hand.num_cards() == 2:
                    print("d: Double Down")
                if player_hand.can_split() and family_splits.get(family_for_hand.get(player_hand,0), 0) < ConsoleGame.MAX_SPLITS:
                    print("v: Split")
                action = input().strip().lower()

            if action == 'h':
                game.player_hit(handnum=0)
                player_hand = game.player_hands[0]
                if player_hand.is_busted():
                    print("Player busted!")
                    dealer_hand.show_cards()
                    return ("L", bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))
                continue

            elif action == 's':
                game.dealer_play(Auto=False)
                dealer_hand.show_cards()
                result = game.get_winner(0)
                print(result)
                return (result, bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))

            elif action == 'd' and player_hand.num_cards() == 2 and balance >= bet_amount:
                bet_amount *= 2
                game.player_hit(handnum=0)
                player_hand = game.player_hands[0]
                if player_hand.is_busted():
                    print("Player busted after doubling down!")
                    dealer_hand.show_cards()
                    return ("L", bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))
                game.dealer_play(Auto=False)
                dealer_hand.show_cards()
                result = game.get_winner(0)
                print(result)
                return (result, bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))

            elif action == 'v' and player_hand.can_split() and balance >= bet_amount:
                # Only allow split if family hasn't exceeded MAX_SPLITS
                family_id = family_for_hand.get(player_hand, 0)
                if family_splits.get(family_id, 0) >= ConsoleGame.MAX_SPLITS:
                    print("Maximum splits reached for this hand.")
                    continue

                print("splitting")
                # perform split on the primary hand index 0
                game.deal_split(0)
                # mark the new hand as same family and increment split count
                if len(game.player_hands) > 1:
                    new_hand = game.player_hands[1]
                    family_for_hand[new_hand] = family_id
                    family_splits[family_id] = family_splits.get(family_id, 0) + 1

                # Now play all hands belonging to this family sequentially (including any new ones created by nested splits)
                played_indices = set()
                results = []
                bets = {}

                # initialize bets for existing family hands
                for idx, h in enumerate(game.player_hands):
                    if family_for_hand.get(h) == family_id:
                        bets[idx] = bet_amount

                while True:
                    # collect current indices for this family in table order
                    family_indices = [i for i,h in enumerate(game.player_hands) if family_for_hand.get(h) == family_id]
                    # find next unplayed index
                    next_idx = None
                    for i in family_indices:
                        if i not in played_indices:
                            next_idx = i
                            break
                    if next_idx is None:
                        break

                    # play that hand; played_hand_split may itself perform additional splits (it updates maps)
                    h_obj, b_out = ConsoleGame.played_hand_split(
                        game, bets.get(next_idx, bet_amount), handnum=next_idx,
                        balance=balance - bet_amount,
                        family_for_hand=family_for_hand,
                        family_splits=family_splits,
                        max_splits=ConsoleGame.MAX_SPLITS
                    )
                    # ensure bets mapping for any newly created family hands
                    for idx, hh in enumerate(game.player_hands):
                        if family_for_hand.get(hh) == family_id and idx not in bets:
                            bets[idx] = bet_amount

                    played_indices.add(next_idx)

                # Dealer plays once for the whole family
                game.dealer_play(Auto=False)
                dealer_hand.show_cards()

                # Score each family hand independently in order
                out_results = []
                for idx, h in enumerate(game.player_hands):
                    if family_for_hand.get(h) == family_id:
                        r = game.get_winner(idx)
                        b = bets.get(idx, bet_amount)
                        cnt = ConsoleGame.count_cards([h, dealer_hand])
                        out_results.append((r, b, cnt))
                        print(r)

                return out_results

            else:
                print("Invalid action.")

        return ("E", bet_amount)