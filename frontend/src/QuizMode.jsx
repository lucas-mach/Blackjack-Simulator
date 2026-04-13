import React, { useState, useEffect } from 'react';
import Card from './Card';
import './QuizMode.css';

const QuizMode = ({ onBack }) => {
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const fetchQuestion = async () => {
    setLoading(true);
    setSelectedAction(null);
    setResult(null);
    try {
      const res = await fetch('http://localhost:8000/quiz-mode/question');
      const data = await res.json();
      setScenario(data);
    } catch (err) {
      console.error('Failed to fetch quiz question:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestion();
  }, []);

  const submitAnswer = async (action) => {
    if (submitting || result) return;
    setSelectedAction(action);
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:8000/quiz-mode/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.scenarioId,
          selectedAction: action,
        }),
      });
      const data = await res.json();
      setResult(data);
      setStats(prev => ({
        correct: prev.correct + (data.isCorrect ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getDealerCardData = (rank) => {
    const suitOptions = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
    const suit = suitOptions[Math.floor(Math.random() * suitOptions.length)];
    return { rank, suit };
  };

  if (loading) {
    return (
      <div className="quiz-wrap">
        <div className="quiz-loading">Loading scenario...</div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="quiz-wrap">
        <div className="quiz-error">Failed to load scenario. <button className="quiz-retry-btn" onClick={fetchQuestion}>Retry</button></div>
      </div>
    );
  }

  const dealerCard = getDealerCardData(scenario.dealerUpcard);

  return (
    <div className="quiz-wrap">
      <div className="quiz-top-bar">
        <button className="quiz-back-btn" onClick={onBack}>← Back</button>
        <div className="quiz-stats">
          Score: {stats.correct}/{stats.total}
          {stats.total > 0 && (
            <span className="quiz-pct"> ({Math.round((stats.correct / stats.total) * 100)}%)</span>
          )}
        </div>
        <div className="quiz-strategy-label">{scenario.strategy}</div>
      </div>

      <div className="quiz-table">
        <div className="quiz-dealer-area">
          <div className="quiz-label">Dealer Upcard</div>
          <div className="quiz-dealer-cards">
            <Card rank={dealerCard.rank} suit={dealerCard.suit} />
          </div>
        </div>

        <div className="quiz-question-text">
          What is the correct play?
        </div>

        <div className="quiz-player-area">
          <div className="quiz-label">Your Hand (Value: {scenario.playerTotal})</div>
          <div className="quiz-player-cards">
            {scenario.playerHand.map((card, i) => (
              <Card key={i} rank={card.rank} suit={card.suit} />
            ))}
          </div>
        </div>
      </div>

      <div className="quiz-actions">
        {scenario.allowedActions.map((action) => {
          let btnClass = 'quiz-action-btn';
          if (result && action === result.correctAction) {
            btnClass += ' correct';
          } else if (result && action === selectedAction && !result.isCorrect) {
            btnClass += ' incorrect';
          }
          return (
            <button
              key={action}
              className={btnClass}
              onClick={() => submitAnswer(action)}
              disabled={!!result || submitting}
            >
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </button>
          );
        })}
      </div>

      {result && (
        <div className={`quiz-feedback ${result.isCorrect ? 'correct' : 'incorrect'}`}>
          <div className="quiz-feedback-icon">
            {result.isCorrect ? '✓' : '✗'}
          </div>
          <div className="quiz-feedback-text">{result.feedback}</div>
          <button className="quiz-next-btn" onClick={fetchQuestion}>Next Question →</button>
        </div>
      )}
    </div>
  );
};

export default QuizMode;
