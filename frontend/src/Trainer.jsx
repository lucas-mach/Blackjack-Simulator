import React, { useState } from 'react';
import Terminal from './Terminal';
import QuizMode from './QuizMode';
import './Trainer.css';

const Trainer = () => {
  const [mode, setMode] = useState(null); // null = selection, 'play', 'quiz'
  const [handCount, setHandCount] = useState(1);

  const handleGameComplete = () => {
    setHandCount(prev => prev + 1);
    // NOTE: Do NOT change Terminal's key here — that would remount the component
    // and open a new WebSocket, resetting the backend game session and balance.
  };

  if (mode === null) {
    return (
      <div className="trainer-wrap">
        <div className="trainer-header">
          <h2>Blackjack Trainer</h2>
          <p className="trainer-subtitle">Choose a training mode</p>
        </div>
        <div className="trainer-mode-select">
          <button className="trainer-mode-btn" onClick={() => setMode('play')}>
            <span className="material-symbols-outlined trainer-mode-icon">playing_cards</span>
            <span className="trainer-mode-title">Play Hands</span>
            <span className="trainer-mode-desc">Play blackjack hands</span>
          </button>
          <button className="trainer-mode-btn" onClick={() => setMode('quiz')}>
            <span className="material-symbols-outlined trainer-mode-icon">quiz</span>
            <span className="trainer-mode-title">Quiz Mode</span>
            <span className="trainer-mode-desc">Test your basic strategy knowledge</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'quiz') {
    return (
      <div className="trainer-wrap">
        <QuizMode onBack={() => setMode(null)} />
      </div>
    );
  }

  return (
    <div className="trainer-wrap">
      <div className="trainer-header">
        <h2>Blackjack Trainer - Hand {handCount}</h2>
        <button className="trainer-back-btn" onClick={() => setMode(null)}>← Back to modes</button>
      </div>
      <Terminal autoSelect={true} onGameComplete={handleGameComplete} />
    </div>
  );
};

export default Trainer;
