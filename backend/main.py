from fastapi import FastAPI

app = FastAPI(title="Blackjack Simulator API")

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Backend is running successfully!",
        "version": "0.1.0"
    }