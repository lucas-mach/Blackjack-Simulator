// sample scenario for frontend development and testing
// the user needs to be presented with the player's hand, the dealer's upcard, the allowed actions and the counts.
export const mockQuizModeScenario = {
  scenarioId: 1,
  playerHand: ["8", "8"],
  playerTotal: 16,
  dealerUpcard: "10",
  allowedActions: ["hit", "stand", "split", "double"],
  runningCount: 6,
  trueCount: 2,

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