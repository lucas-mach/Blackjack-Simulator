from console import ConsoleGame
from bj import PlayerHand, Deck, Card
from auto import AutoGame
import uuid

# interprets the actions returned from strategy
ACTION_MAP = {
    "h": "hit",
    "s": "stand",
    "d": "double",
    "v": "split"
}
# this will store generated quiz scenarios for reference when checking answers
QUIZ_SCENARIOS = {}  
# limit the number of stored scenarios to prevent memory issues; can be adjusted based on expected usage
MAX_STORED_SCENARIOS = 50


# this is what the API will call
# returns scenario question aligning with what the frontend expects
def generate_quiz_question():
    scenario = generate_quiz_scenario()
    scenario_id = str(uuid.uuid4())
    QUIZ_SCENARIOS[scenario_id] = scenario

    # ensures we don't store too many scenarios in memory; removes the oldest scenario when we exceed the limit
    if len(QUIZ_SCENARIOS) > MAX_STORED_SCENARIOS:
        oldest_key = next(iter(QUIZ_SCENARIOS))
        del QUIZ_SCENARIOS[oldest_key]

    return {
        # creates a id for each scenario
        "scenarioId": scenario_id,
        "playerHand": scenario["player_hand"],
        "playerTotal": scenario["player_total"],
        "dealerUpcard": scenario["dealer_upcard"],
        "allowedActions": scenario["allowed_actions"],
        ##"runningCount": 0,
        ##"trueCount": 0,
        "strategy": "Basic Strategy",
        "rules": {
            "dealerHitsSoft17": False,
            "doubleAfterSplit": True
        },
        # "correctAction": get_correct_action(scenario)
    }



# stops console at action prompt so we only get one scenario
def generate_quiz_scenario():
    while True:
        # stores the scenario data
        captured = {}

     # user input is not needed here 
        def fake_input():
            return None  


        def capture_output(event):
            # lets us update captured
            nonlocal captured

             # player hand
            if isinstance(event, dict) and event.get('type') == 'hand' and event.get('owner') == 'player':
                captured['player_hand'] = event['cards']
                captured['player_total'] = event['value']

            # dealer upcard
            if isinstance(event, dict) and event.get('type') == 'card_shown':
                if event.get('card'):
                    captured['dealer_upcard'] = event['card']['rank']

            # when we see the actions we stop the iteration
            if isinstance(event, dict) and event.get('type') == 'actions':
                captured['allowed_actions'] = [
                    'double' if a['label'].lower() == 'double down' else a['label'].lower()
                    for a in event['actions']
                ]

                # stop the game after capturing the allowed actions, since that's the main output we need for the quiz
                raise StopIteration 

        deck = Deck(num_decks=8)
        # gives a a new hand every time, so we can capture different scenarios
        deck.shuffle()
        game = deck.new_game()

        # runs the game with our fake input and capture output functions
        try:
            ConsoleGame.played_hand(
                game=game,
                bet_amount=10,
                balance=1000,
                input_func=fake_input,
                output_func=capture_output
            )
        except StopIteration:
            # unecessary rn but to be updated to reflect actual running count and true count in the quiz
            captured["running_count"] = 0
            captured["true_count"] = 0
            return captured

        
# converts our card list into what the strategy function expects
def build_player_hand(player_hand_data):
    hand = PlayerHand()
    suit_map = {
        "Hearts": "♡",
        "Diamonds": "♢",
        "Clubs": "♧",
        "Spades": "♤"
    }

    for card in player_hand_data:
        rank = card["rank"]
        suit = suit_map[card["suit"]]
        hand.draw_card(Card(rank, suit))

    return hand

# this does the same as above but for the dealer upcard, since the strategy function just needs the rank value of the upcard
def get_dealer_value(rank):
    if rank in ["J", "Q", "K"]:
        return 10
    if rank == "A":
        return 11
    return int(rank)

# calculates the action for the generated scenario
def get_correct_action(scenario):
    player_hand = build_player_hand(scenario["player_hand"])
    dealer_value = get_dealer_value(scenario["dealer_upcard"])

    # for now assume true count to be 0; meaning basic strategy
    strategy_path = AutoGame.determine_strategy(0)
    strategy = AutoGame.Strategy(strategy_path)

    action_code = strategy.get_action(player_hand, dealer_value)
    
    # translates the action code from the strategy function into the actual action label we want to return to the frontend
    return ACTION_MAP[action_code]      

# this section are functions that will be used to check the user's answer and provide feedback

def check_quiz_answer(scenario_id, selected_action):
    # retrieves the scenario data using the scenario_id
    scenario = QUIZ_SCENARIOS.get(scenario_id)

    if not scenario:
        return {"isCorrect": False, 
                "correctAction": None,
                "feedback": "Scenario was not found. Please try again."}

    correct_action = get_correct_action(scenario)
    is_correct = (selected_action.lower() == correct_action.lower())

    feedback = build_user_feedback(scenario, selected_action, correct_action)

    return {
        "isCorrect": is_correct,
        "correctAction": correct_action,
        "feedback": feedback
    }

# builds the feedback message to be returned to the user after they submit their answer, based on whether they were correct or not and what the correct action is for the scenario
def build_user_feedback(scenario, selected_action, correct_action):
    dealer_upcard = scenario["dealer_upcard"]
    player_total = scenario["player_total"]

    if selected_action.lower() == correct_action.lower():
        return f"Your answer is correct! Basic strategy recommends {correct_action} for {player_total} against a dealer {dealer_upcard}."

    return f"Your answer is incorrect. Basic strategy recommends {correct_action} for {player_total} against a dealer {dealer_upcard}."

