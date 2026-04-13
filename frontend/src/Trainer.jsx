import React, { useState } from 'react';
import Terminal from './Terminal';
import './App.css';
import './Simulation.css';
import './Trainer.css';

const Trainer = () => {
  const [handCount, setHandCount] = useState(1);

  const handleGameComplete = () => {
    setHandCount((prev) => prev + 1);
  };

  return (
    <div className="app-container simulation-root">
      <Terminal autoSelect={true} handCount={handCount} onGameComplete={handleGameComplete} />
    </div>
  );
};

export default Trainer;
