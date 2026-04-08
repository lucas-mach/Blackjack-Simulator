import React, { useState } from 'react';
import Terminal from './Terminal';

const Trainer = () => {
  const [handCount, setHandCount] = useState(1);

  const handleGameComplete = () => {
    setHandCount(prev => prev + 1);
    // NOTE: Do NOT change Terminal's key here — that would remount the component
    // and open a new WebSocket, resetting the backend game session and balance.
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#ddd' }}>
        <h2>Blackjack Trainer - Hand {handCount}</h2>
      </div>
      <Terminal autoSelect={true} onGameComplete={handleGameComplete} />
      
    </div>
  );
};

export default Trainer;
