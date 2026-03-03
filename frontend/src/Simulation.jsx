import React, { useState } from 'react';
import './App.css';

const Simulation = () => {
  const [output, setOutput] = useState('');
  const [numGames, setNumGames] = useState(200);
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [numDecks, setNumDecks] = useState(8);
  const [graphUrl, setGraphUrl] = useState(null);

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

  const [resultsData, setResultsData] = useState(null);

  const fetchResults = async () => {
    try {
      const res = await fetch('http://localhost:8010/results');
      const text = await res.text();

      const rows = text.trim().split('\n');
      if (rows.length > 0) {
        const headers = rows[0].split(',');
        const parsed = rows.slice(1).map(row => {
          const cols = row.split(',');
          return headers.reduce((acc, h, i) => {
            acc[h.trim()] = cols[i] ? cols[i].trim() : '';
            return acc;
          }, {});
        });
        setResultsData(parsed);
        setOutput('');
      } else {
        setOutput('No results data found.');
      }
    } catch (err) {
      setOutput('Failed to fetch results: ' + err);
    }
  };

  return (
    <div className="app-container">
      <h2 style={{ marginTop: '-15rem', textAlign: 'left' }}>Simulation Mode</h2>
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <label style={{ marginRight: '0.5rem' }}>Number of Games:</label>
          <input
            type="number"
            value={numGames}
            onChange={(e) => setNumGames(e.target.value)}
            min="1"
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #444',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              fontSize: '1rem',
              width: '120px',
            }}
          />
        </div>
        <div>
          <label style={{ marginRight: '0.5rem' }}>Balance:</label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            min="1"
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #444',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              fontSize: '1rem',
              width: '120px',
            }}
          />
        </div>
        <div>
          <label style={{ marginRight: '0.5rem' }}>Bet Amount:</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min="1"
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #444',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              fontSize: '1rem',
              width: '120px',
            }}
          />
        </div>
        <div>
          <label style={{ marginRight: '0.5rem' }}>Number of Decks:</label>
          <input
            type="number"
            value={numDecks}
            onChange={(e) => setNumDecks(e.target.value)}
            min="1"
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #444',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              fontSize: '1rem',
              width: '120px',
            }}
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
        <button className="run-btn" onClick={() => setGraphUrl(`http://localhost:8010/graph?t=${new Date().getTime()}`)}>
          View Graph
        </button>
        <div className="results-link" style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a
            href="http://localhost:8010/results"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Results (results.csv)
          </a>
        </div>
      </div>
      <div className="info-box">
        {output && <div style={{ marginBottom: '1rem' }}>{output}</div>}
        {!output && !resultsData && 'Click "Run Simulation (REST)" to start.'}

        {resultsData && resultsData.length > 0 && (
          <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '1rem', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#222', zIndex: 1 }}>
                <tr>
                  {Object.keys(resultsData[0]).map((h, i) => (
                    <th key={i} style={{ padding: '8px', borderBottom: '1px solid #444', color: '#1eb854' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultsData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{ padding: '6px 8px', color: '#ccc' }}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {graphUrl && (
        <div style={{ marginTop: '2rem', textAlign: 'center', width: '100%' }}>
          <img src={graphUrl} alt="Simulation Graph" style={{ maxWidth: '100%', border: '1px solid #444', borderRadius: '4px' }} />
        </div>
      )}
    </div>
  );
};

export default Simulation;
