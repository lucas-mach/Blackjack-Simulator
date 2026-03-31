import React, { useState } from 'react';
import Terminal from './Terminal';
import './Trainer.css';

const Trainer = () => {
  const [handCount, setHandCount] = useState(1);

  const handleGameComplete = () => {
    setHandCount(prev => prev + 1);
  };

  return (
    <div className="trainer-wrap">
      <div className="trainer-header">
        <h2>Blackjack Trainer - Hand {handCount}</h2>
      </div>
      <Terminal key={handCount} autoSelect={true} onGameComplete={handleGameComplete} />
    </div>
  );
};

export default Trainer;
