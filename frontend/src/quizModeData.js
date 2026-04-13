// sample scenario for frontend development and testing
// the user needs to be presented with the player's hand, the dealer's upcard, the allowed actions and the counts.
export const mockQuizModeScenario = {
  scenarioId: 1,
  playerHand: ["8", "8"],
  playerTotal: 16,
  dealerUpcard: "10",
  allowedActions: ["hit", "stand", "split", "double"],
  // add counts when we implement change in strategy. 
  // runningCount: 6,
  // trueCount: 2,

  // context that will come from dashboard (to be updated to reflect actual full rules scope and strategy used in the quiz)
  strategy: "Basic Strategy",
  rules: { 
    dealerHitsSoft17: false,
    doubleAfterSplit: true,
  }
};


// sample response for when the user submits an answer to the quiz question
export const mockQuizModeResponse = {
  isCorrect: false,
  correctAction: "split",
  feedback: "Basic strategy recommends splitting 8s against a dealer 10.",
};

/* this should be helpful for testing the frontend integration with the backend quiz mode endpoints.

# get quiz question
const res = await fetch("/quiz-mode/question");
const data = await res.json();

# submit quiz answer
await fetch("/quiz-mode/answer", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    scenarioId,
    selectedAction: "hit"
  })
});

*/