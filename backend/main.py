from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from console import ConsoleGame
from auto import AutoGame
from bj import RuleSet
import threading
import queue
import asyncio
import os
from engine import simulate_hand, simulate_many
import json
from typing import Dict, Optional

app = FastAPI(title="Blackjack Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "HEAD"],  #<---------------------NEW Fix: explicit instead of "*"
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin"],
    expose_headers=["Content-Disposition"],
    allow_origin_regex=None,
    max_age=86400,
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Backend is running successfully!",
        "version": "0.1.0"
    }

@app.get("/results")
def get_results():
    # serve the latest CSV output from auto-play
    results_path = os.path.join(os.getcwd(), "results.csv")
    if not os.path.exists(results_path):
        #return FileResponse(results_path, media_type="text/csv", filename="results.csv")
        return {"error": "Results file not found. Run a simulation first."}
    #return {"error": "Results file not found. Run a simulation first."}
    return FileResponse(
        results_path,
        media_type="text/csv",
        filename="results.csv",
        headers={
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Accept",
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Access-Control-Max-Age": "86400",
        }
    )


class SimRequest(BaseModel):
    num_games: int = 1000
    balance: int = 1000
    bet_amount: int = 10
    num_decks: int = 8
    # Custom rules
    blackjack_payout: str = '3:2'
    max_splits: int = 4
    double_on: str = 'any'
    double_after_split: bool = True
    dealer_hits_soft_17: bool = False
    split_aces: str = 'no_play'
    surrender_allowed: bool = False
    insurance_allowed: bool = True


@app.post("/simulate")
def simulate(req: SimRequest):
    rules = RuleSet(
        blackjack_payout=req.blackjack_payout,
        max_splits=req.max_splits,
        double_on=req.double_on,
        double_after_split=req.double_after_split,
        dealer_hits_soft_17=req.dealer_hits_soft_17,
        split_aces=req.split_aces,
        surrender_allowed=req.surrender_allowed,
        insurance_allowed=req.insurance_allowed,
    )
    # Run the simulation and get results as JSON
    sim_results = AutoGame.auto_play_loop(
        num_games=req.num_games,
        balance=req.balance,
        bet_amount=req.bet_amount,
        num_decks=req.num_decks,
        rules=rules,
        input_func=lambda *args, **kwargs: None,
        output_func=lambda *args, **kwargs: None,
        return_as_json=True
    )
    # Also save CSV + generate graph in the background
    try:
        import pandas as pd
        results_df = pd.DataFrame(sim_results.get("results", []))
        results_df.to_csv("results.csv", index=False)
        from graph import SimGraph
        SimGraph().generate()
    except Exception as e:
        print(f"Graph generation failed: {e}")
    return sim_results


@app.get("/graph")
def get_graph():
    graph_path = os.path.join(os.getcwd(), "simulation_graph.png")
    if not os.path.exists(graph_path):
        #return FileResponse(graph_path, media_type="image/png")
        return {"error": "No graph found. Run a simulation first."}
    return FileResponse(
        graph_path,
        media_type="image/png",
        filename="simulation_graph.png",
        headers={
            "Access-Control-Allow-Origin": "http://localhost:5173",
        }
    )





class GameSession:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.input_queue = queue.Queue()
        self.game_thread = None
        self.is_active = True
        self.loop = asyncio.get_running_loop()

    async def start(self):
        await self.websocket.accept()
        self.game_thread = threading.Thread(target=self.run_game, daemon=True)
        self.game_thread.start()
        try:
            while self.is_active:
                data = await self.websocket.receive_text()
                self.input_queue.put(data)
        except WebSocketDisconnect:
            self.is_active = False
            print("Client disconnected")

    def run_game(self):
        def input_func(prompt=""):
            # send a structured prompt message to the client
            if prompt:
                try:
                    self.send_message(json.dumps({'type': 'prompt', 'text': prompt}))
                except Exception:
                    self.send_message(prompt)
            while self.is_active:
                try:
                    return self.input_queue.get(timeout=0.5)
                except queue.Empty:
                    continue
            return "quit"

        def output_func(*args, **kwargs):
            # Accept either a single dict (structured event) or plain text args
            if not self.is_active:
                return
            try:
                if len(args) == 1 and isinstance(args[0], dict):
                    payload = args[0]
                    self.send_message(json.dumps(payload))
                else:
                    msg = " ".join(map(str, args))
                    self.send_message(json.dumps({'type': 'text', 'text': msg}))
            except Exception:
                # Fallback to plain text send
                try:
                    msg = " ".join(map(str, args))
                    self.send_message(msg)
                except Exception:
                    pass

        try:
            output_func("Welcome to Blackjack!")
            mode = input_func("Choose mode: (1) Console Play (2) Auto Play\n").strip()
            if mode == '1':
                # Try to receive rules config from client (JSON message with type 'rules')
                rules = RuleSet()
                try:
                    rules_raw = self.input_queue.get(timeout=1.0)
                    if rules_raw and rules_raw.startswith('{'):
                        rules_data = json.loads(rules_raw)
                        if rules_data.get('type') == 'rules':
                            rules = RuleSet(
                                blackjack_payout=rules_data.get('blackjack_payout', '3:2'),
                                max_splits=int(rules_data.get('max_splits', 4)),
                                double_on=rules_data.get('double_on', 'any'),
                                double_after_split=bool(rules_data.get('double_after_split', True)),
                                dealer_hits_soft_17=bool(rules_data.get('dealer_hits_soft_17', False)),
                                split_aces=rules_data.get('split_aces', 'play_no_resplit'),
                                surrender_allowed=bool(rules_data.get('surrender_allowed', False)),
                                insurance_allowed=bool(rules_data.get('insurance_allowed', False)),
                            )
                        else:
                            # Not a rules message, put it back in queue as a bet input
                            self.input_queue.put(rules_raw)
                    elif rules_raw:
                        self.input_queue.put(rules_raw)
                except queue.Empty:
                    pass  # No rules message, use defaults
                ConsoleGame.console_play(rules=rules, input_func=input_func, output_func=output_func)
            elif mode == '2':
                try:
                    num_games_str = input_func("Enter number of games to play: ").strip()
                    num_games = int(num_games_str)
                    balance_str = input_func("Enter starting balance: ").strip()
                    balance = int(balance_str)
                    bet_amount_str = input_func("Enter bet amount per game: ").strip()
                    bet_amount = int(bet_amount_str)
                    num_decks_str = input_func("Enter number of decks: ").strip()
                    num_decks = int(num_decks_str)
                    output_func("Playing ", num_games, " games with balance ", balance, ", bet amount ", bet_amount, ", and ", num_decks, " decks.")
                    try:
                        results_df = AutoGame.auto_play_loop(
                            num_games=num_games, 
                            balance=balance, 
                            bet_amount=bet_amount, 
                            num_decks=num_decks,
                            input_func=input_func,
                            output_func=output_func
                        )
                        output_func("\nSimulation complete. You can download results.csv from the website link.")
                    except Exception as e:
                        output_func(f"Simulation error: {e}")
                except ValueError:
                    output_func("Invalid input. Please enter numbers for the simulation parameters.")
            else:
                output_func("Invalid mode selected.")
        except Exception as e:
            if self.is_active:
                output_func(f"Fatal error: {e}")

    def send_message(self, message):
        if not self.is_active:
            return
        try:
            asyncio.run_coroutine_threadsafe(self.websocket.send_text(message), self.loop)
        except Exception as e:
            print(f"Error sending message: {e}")
            self.is_active = False

@app.websocket("/ws/game")
async def websocket_endpoint(websocket: WebSocket):
    session = GameSession(websocket)
    await session.start()

@app.post("/simulate-hand")
def simulate_single_hand():
    result = simulate_hand()
    return result


@app.post("/simulate-batch")
def run_batch_simulation(body: Dict = Body(...)):
    count = body.get('count', 1000)
    seed = body.get('seed')  # Optional
    if not isinstance(count, int) or count < 1 or count > 100000:
        raise HTTPException(status_code=400, detail="Count must be an integer between 1 and 100,000")

    try:
        results = simulate_many(count=count, seed=seed)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))