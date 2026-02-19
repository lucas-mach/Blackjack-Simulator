from bj import Game, PlayerHand, DealerHand, Deck, Card
class ConsoleGame:
    MAX_SPLITS = 4

    def count_cards(hands):
        """Return Hi-Lo count for a collection of hands."""
        total = 0
        for hand in hands:
            cards = getattr(hand, 'cards', hand)
            for c in cards:
                rank = getattr(c, 'rank', c)
                r = str(rank)
                if r in ('2', '3', '4', '5', '6'):
                    total += 1
                elif r in ('10', 'J', 'Q', 'K', 'A'):
                    total -= 1
        return total
    
    def console_play(balance=1000, input_func=input, output_func=print):
        deck = Deck(num_decks=8)
        card_count = 0
        deck.shuffle()
        while True:
            bet = -1
            while bet < 0:
                try:
                    output_func({'type': 'state', 'balance': balance})
                    try:
                        bet_str = input_func("Enter bet: ")
                        if bet_str is None: # Handle disconnect
                            return
                        bet = int(bet_str.strip().lower())
                    except (ValueError, AttributeError):
                        bet = -1
                    if(bet < 0):
                        output_func("Bet must be non-negative. Try again.")
                    if bet > balance:
                        output_func("Insufficient balance. Try again.")
                        bet = -1
                except ValueError:
                    output_func("Invalid input. Please enter a valid bet amount.")
                    continue
                
            game = deck.new_game()
            round_result = ConsoleGame.played_hand(game, bet, balance, input_func=input_func, output_func=output_func)
            # Emit structured result event
            try:
                profit = Game.interpret_result(round_result)
            except Exception:
                profit = 0

            if isinstance(round_result, list):
                outcomes = []
                for res in round_result:
                    r = res[0] if isinstance(res, (list, tuple)) else res
                    outcomes.append(r)
                output_func({'type': 'result', 'outcome': 'split', 'outcomes': outcomes, 'profit': profit})
            else:
                r = round_result[0] if isinstance(round_result, (list, tuple)) else round_result
                if r == 'W' or r == 'W!':
                    output_func({'type': 'result', 'outcome': 'win', 'profit': profit})
                elif r == 'L':
                    output_func({'type': 'result', 'outcome': 'loss', 'profit': profit})
                elif r == 'P':
                    output_func({'type': 'result', 'outcome': 'push', 'profit': profit})
                else:
                    output_func({'type': 'result', 'outcome': str(r), 'profit': profit})
            card_count += ConsoleGame.interpret_count_from_result(round_result)
            true_count = card_count / (len(deck.cards)/52) if len(deck.cards) > 0 else 0
            output_func("Card Count: ", card_count)
            output_func("True Count: ", round(true_count, 2))
            output_func("Profit/Loss:", Game.interpret_result(round_result))
            balance += Game.interpret_result(round_result)
            game.end_game()
            
            if len(deck.cards) < (52 * 8 * 0.25):
                output_func("Reshuffling deck...")
                deck = Deck(num_decks=8)
                deck.shuffle()

    def interpret_count_from_result(result):
        if isinstance(result, tuple):
            return result[2] if len(result) > 2 else 0
        if isinstance(result, list):
            return sum(ConsoleGame.interpret_count_from_result(r) for r in result)
        return 0

    def played_hand_split(game, bet_amount, handnum=0, balance=0, family_for_hand=None, family_splits=None, max_splits=MAX_SPLITS, input_func=input, output_func=print):
        if handnum < 0 or handnum >= len(game.player_hands):
            raise IndexError("Invalid hand number for split play")
        if family_for_hand is None or family_splits is None:
            raise RuntimeError("family_for_hand and family_splits must be provided")

        hand = game.player_hands[handnum]
        family_id = family_for_hand.get(hand, None)
        if family_id is None:
            family_id = max(list(family_splits.keys()) + [-1]) + 1
            family_for_hand[hand] = family_id
            family_splits[family_id] = 0

        while not hand.is_busted():
            if hand.get_value() == 21:
                output_func({'type': 'hand', 'owner': 'player', 'cards': hand.get_cards_structured(), 'value': hand.get_value()})
                output_func('21: no more action')
                break
            if hand.has_soft_ace():
                msg = f"{hand.get_value() - 10}, {hand.get_value()}"
            else:
                msg = f"{hand.get_value()}"
            output_func({'type': 'hand', 'owner': 'player', 'cards': hand.get_cards_structured(), 'value': hand.get_value()})
            output_func(f"Value: {msg}")
            actions = []
            actions.append({'code': 'h', 'label': 'Hit'})
            actions.append({'code': 's', 'label': 'Stand'})
            if hand.num_cards() == 2 and balance >= bet_amount:
                actions.append({'code': 'd', 'label': 'Double Down'})
            if hand.can_split() and family_splits.get(family_id, 0) < max_splits and balance >= bet_amount:
                actions.append({'code': 'v', 'label': 'Split'})
            output_func({'type': 'actions', 'actions': actions})
            action_input = input_func()
            if action_input is None: return (hand, bet_amount) # Handle disconnect
            action = action_input.strip().lower()

            if action == 'h':
                game.player_hit(handnum=handnum)
                hand = game.player_hands[handnum]
                # emit updated player hand so frontend sees the new card
                output_func({'type': 'hand', 'owner': 'player', 'cards': hand.get_cards_structured(), 'value': hand.get_value()})
                if hand.is_busted():
                    break
                continue
            elif action == 's':
                break
            elif action == 'd' and hand.num_cards() == 2 and balance >= bet_amount:
                game.player_hit(handnum=handnum)
                bet_amount *= 2
                hand = game.player_hands[handnum]
                # emit updated player hand after double down
                output_func({'type': 'hand', 'owner': 'player', 'cards': hand.get_cards_structured(), 'value': hand.get_value()})
                break
            elif action == 'v' and hand.can_split() and family_splits.get(family_id, 0) < max_splits:
                game.deal_split(handnum)
                if handnum + 1 < len(game.player_hands):
                    new_hand = game.player_hands[handnum + 1]
                    family_for_hand[new_hand] = family_id
                    family_splits[family_id] = family_splits.get(family_id, 0) + 1
                hand = game.player_hands[handnum]
                continue
            else:
                output_func("Invalid action.")
        return (game.player_hands[handnum], bet_amount)

    def played_hand(game, bet_amount, balance, input_func=input, output_func=print):
        game.new_hand()
        family_for_hand = {}
        family_splits = {}
        for idx, h in enumerate(game.player_hands):
            fid = idx
            family_for_hand[h] = fid
            family_splits[fid] = 0

        dealer_hand = game.dealer_hand
        game.deal_initial()
        player_hand = game.player_hands[0]

        while not player_hand.is_busted():
            # Send dealer shown card (structured) with suit name and value
            if getattr(dealer_hand, 'cards', None) and len(dealer_hand.cards) > 0:
                shown = dealer_hand.cards[0]
                suit_map = {'♤': 'Spades', '♡': 'Hearts', '♧': 'Clubs', '♢': 'Diamonds'}
                suit_name = suit_map.get(shown.suit, str(shown.suit))
                try:
                    card_value = shown.get_value()
                except Exception:
                    card_value = None
                # indicate that dealer has a facedown card when more than one card exists
                face_down = len(dealer_hand.cards) > 1
                output_func({'type': 'card_shown', 'card': {'rank': shown.rank, 'suit': suit_name, 'value': card_value}, 'faceDown': face_down})
            else:
                output_func({'type': 'card_shown', 'card': None})
            if player_hand.has_soft_ace():
                msg = f"{player_hand.get_value() - 10}, {player_hand.get_value()}"
            else:
                msg = f"{player_hand.get_value()}"
            output_func({'type': 'hand', 'owner': 'player', 'cards': player_hand.get_cards_structured(), 'value': player_hand.get_value()})
            output_func(f"Value: {msg}")
            if player_hand.get_value() == 21 and player_hand.num_cards() == 2:
                # send dealer full hand
                output_func({'type': 'hand', 'owner': 'dealer', 'cards': dealer_hand.get_cards_structured(), 'value': dealer_hand.get_value()})
                if dealer_hand.blackjack():
                    output_func("Push!")
                    return ("P", bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))
                output_func("Blackjack! You win!")
                return ("W!", bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))

            if dealer_hand.blackjack():
                # send dealer full hand before announcing result
                output_func({'type': 'hand', 'owner': 'dealer', 'cards': dealer_hand.get_cards_structured(), 'value': dealer_hand.get_value()})
                output_func("Dealer has Blackjack! You lose!")
                return ("L", bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))

            if player_hand.get_value() == 21:
                output_func("21: no more action")
                action = 's'
            else:
                actions = []
                actions.append({'code': 'h', 'label': 'Hit'})
                actions.append({'code': 's', 'label': 'Stand'})
                if player_hand.num_cards() == 2 and balance >= bet_amount:
                    actions.append({'code': 'd', 'label': 'Double Down'})
                if player_hand.can_split() and family_splits.get(family_for_hand.get(player_hand, 0), 0) < ConsoleGame.MAX_SPLITS and balance >= bet_amount:
                    actions.append({'code': 'v', 'label': 'Split'})
                output_func({'type': 'actions', 'actions': actions})
                action_input = input_func()
                if action_input is None: return ("E", bet_amount) # Handle disconnect
                action = action_input.strip().lower()

            if action == 'h':
                game.player_hit(handnum=0)
                player_hand = game.player_hands[0]
                # emit updated player hand so frontend sees the new card
                output_func({'type': 'hand', 'owner': 'player', 'cards': player_hand.get_cards_structured(), 'value': player_hand.get_value()})
                if player_hand.is_busted():
                    # reveal dealer full hand before returning so frontend can show it
                    output_func({'type': 'hand', 'owner': 'dealer', 'cards': dealer_hand.get_cards_structured(), 'value': dealer_hand.get_value()})
                    output_func("Player busted!")
                    return ("L", bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))
                continue
            elif action == 's':
                game.dealer_play(Auto=False, output_func=output_func)
                result = game.get_winner(0)
                output_func({'type': 'hand', 'owner': 'dealer', 'cards': dealer_hand.get_cards_structured(), 'value': dealer_hand.get_value()})
                output_func(result)
                return (result, bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))
            elif action == 'd' and player_hand.num_cards() == 2 and balance >= bet_amount:
                bet_amount *= 2
                game.player_hit(handnum=0)
                player_hand = game.player_hands[0]
                # emit updated player hand after double down
                output_func({'type': 'hand', 'owner': 'player', 'cards': player_hand.get_cards_structured(), 'value': player_hand.get_value()})
                if player_hand.is_busted():
                    # reveal dealer full hand before returning so frontend can show it
                    output_func({'type': 'hand', 'owner': 'dealer', 'cards': dealer_hand.get_cards_structured(), 'value': dealer_hand.get_value()})
                    output_func("Player busted after doubling down!")
                    return ("L", bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))
                game.dealer_play(Auto=False, output_func=output_func)
                result = game.get_winner(0)
                output_func({'type': 'hand', 'owner': 'dealer', 'cards': dealer_hand.get_cards_structured(), 'value': dealer_hand.get_value()})
                output_func(result)
                return (result, bet_amount, ConsoleGame.count_cards([player_hand, dealer_hand]))
            elif action == 'v' and player_hand.can_split() and balance >= bet_amount:
                family_id = family_for_hand.get(player_hand, 0)
                if family_splits.get(family_id, 0) >= ConsoleGame.MAX_SPLITS:
                    output_func("Maximum splits reached.")
                    continue
                output_func("Splitting...")
                game.deal_split(0)
                if len(game.player_hands) > 1:
                    new_hand = game.player_hands[1]
                    family_for_hand[new_hand] = family_id
                    family_splits[family_id] = family_splits.get(family_id, 0) + 1
                played_indices = set()
                bets = {}
                for idx, h in enumerate(game.player_hands):
                    if family_for_hand.get(h) == family_id:
                        bets[idx] = bet_amount
                while True:
                    family_indices = [i for i,h in enumerate(game.player_hands) if family_for_hand.get(h) == family_id]
                    next_idx = None
                    for i in family_indices:
                        if i not in played_indices:
                            next_idx = i
                            break
                    if next_idx is None:
                        break
                    _, b_out = ConsoleGame.played_hand_split(
                        game, bets.get(next_idx, bet_amount), handnum=next_idx,
                        balance=balance - bet_amount,
                        family_for_hand=family_for_hand,
                        family_splits=family_splits,
                        max_splits=ConsoleGame.MAX_SPLITS,
                        input_func=input_func,
                        output_func=output_func
                    )
                    for idx, hh in enumerate(game.player_hands):
                        if family_for_hand.get(hh) == family_id and idx not in bets:
                            bets[idx] = bet_amount
                    played_indices.add(next_idx)
                game.dealer_play(Auto=False, output_func=output_func)
                output_func({'type': 'hand', 'owner': 'dealer', 'cards': dealer_hand.get_cards_structured(), 'value': dealer_hand.get_value()})
                out_results = []
                for idx, h in enumerate(game.player_hands):
                    if family_for_hand.get(h) == family_id:
                        r = game.get_winner(idx)
                        b = bets.get(idx, bet_amount)
                        cnt = ConsoleGame.count_cards([h, dealer_hand])
                        out_results.append((r, b, cnt))
                        output_func(f"Hand {idx+1}: {r}")
                return out_results
            else:
                output_func("Invalid action.")
        return ("E", bet_amount)