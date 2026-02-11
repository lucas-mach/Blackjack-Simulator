from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from console import ConsoleGame
from auto import AutoGame
import threading
import queue
import asyncio
import os

app = FastAPI(title="Blackjack Simulator API")

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Backend is running successfully!",
        "version": "0.1.0"
    }

@app.get("/results")
def get_results():
    results_path = os.path.join(os.getcwd(), "results.txt")
    if os.path.exists(results_path):
        return FileResponse(results_path, media_type="text/plain", filename="results.txt")
    return {"error": "Results file not found. Run a simulation first."}

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
            if prompt:
                self.send_message(prompt)
            while self.is_active:
                try:
                    return self.input_queue.get(timeout=0.5)
                except queue.Empty:
                    continue
            return "quit"

        def output_func(*args, **kwargs):
            if not self.is_active:
                return
            msg = " ".join(map(str, args))
            self.send_message(msg)

        try:
            output_func("Welcome to Blackjack!")
            mode = input_func("Choose mode: (1) Console Play (2) Auto Play\n").strip()
            if mode == '1':
                ConsoleGame.console_play(input_func=input_func, output_func=output_func)
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
                        AutoGame.auto_play_loop(
                            num_games=num_games, 
                            balance=balance, 
                            bet_amount=bet_amount, 
                            num_decks=num_decks,
                            input_func=input_func,
                            output_func=output_func
                        )
                        output_func("\nSimulation complete. You can download results.txt from the website link.")
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