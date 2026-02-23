import React, { useState } from 'react';
import './App.css';

const Simulation = () => {
  const [output, setOutput] = useState('');
  const [numGames, setNumGames] = useState(200);
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [numDecks, setNumDecks] = useState(8);

  const runRestSimulation = async () => {
    try {
      setOutput('Running REST simulation...');

      const res = await fetch('http://localhost:8010/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          num_games: parseInt(numGames) || 200,
          balance: parseInt(balance) || 1000,
          bet_amount: parseInt(betAmount) || 10,
          num_decks: parseInt(numDecks) || 8,
        }),
      });

      const data = await res.json();
      setOutput(`REST simulation complete: ${data.num_games} games.`);
    } catch (err) {
      setOutput('Simulation failed: ' + err);
    }
  };

  const fetchResults = async () => {
    try {
      const res = await fetch('http://localhost:8010/results');
      const text = await res.text();
      setOutput(text);
    } catch (err) {
      setOutput('Failed to fetch results: ' + err);
    }
  };

  return (
    <div className="app-container">
      <h2 className="simulation-title">Simulation Mode</h2>
      <div className="simulation-form">
        <div className="simulation-form-row">
          <label>Number of Games:</label>
          <input
            type="number"
            value={numGames}
            onChange={(e) => setNumGames(e.target.value)}
            min="1"
            className="simulation-input"
          />
        </div>
        <div className="simulation-form-row">
          <label>Balance:</label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            min="1"
            className="simulation-input"
          />
        </div>
        <div className="simulation-form-row">
          <label>Bet Amount:</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min="1"
            className="simulation-input"
          />
        </div>
        <div className="simulation-form-row">
          <label>Number of Decks:</label>
          <input
            type="number"
            value={numDecks}
            onChange={(e) => setNumDecks(e.target.value)}
            min="1"
            className="simulation-input"
          />
        </div>
      </div>
      <div className="controls">
        <button className="run-btn" onClick={runRestSimulation}>
          Run Simulation (REST)
        </button>
        <button className="run-btn" onClick={fetchResults}>
          View Results (on webpage)
        </button>
        <div className="results-link results-link-wrap">
          <a
            href="http://localhost:8010/results"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Results (results.txt)
          </a>
        </div>
      </div>
      <div className="info-box">
        {output || 'Click "Run Simulation (REST)" to start.'}
      </div>
    </div>
  );
};

export default Simulation;
