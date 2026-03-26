import React, { useState } from 'react';
import './App.css';

const Simulation = () => {
  const [output, setOutput] = useState('');
  const [numGames, setNumGames] = useState(200);
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [numDecks, setNumDecks] = useState(8);
  const [graphUrl, setGraphUrl] = useState(null);


  const runRestSimulation = async () => {    //<--------------------------NEW Fix: Added better catch messages
  try {
    // Validate inputs first - prevents sending bad data
    const games = Number(numGames);
    const bal = Number(balance);
    const bet = Number(betAmount);
    const decks = Number(numDecks);

    if (isNaN(games) || games < 1 || isNaN(bal) || bal < 1 || isNaN(bet) || bet < 1 || isNaN(decks) || decks < 1) {
      setOutput('Please enter valid positive numbers for all fields.');
      return;
    }

    setOutput('Running REST simulation...');

    const res = await fetch('http://localhost:8000/simulate', {  //<-------------NEW Fix: Updated localhost:8010 with correct 8000
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        num_games: games,
        balance: bal,
        bet_amount: bet,
        num_decks: decks,
        // Merge in custom rules from Dashboard settings
        ...(() => {
          try {
            const savedRules = localStorage.getItem('blackjackRules');
            if (savedRules) {
              const r = JSON.parse(savedRules);
              return {
                blackjack_payout: r.blackjack_payout ?? '3:2',
                max_splits: r.max_splits ?? 4,
                double_on: r.double_on ?? 'any',
                double_after_split: r.double_after_split ?? true,
                dealer_hits_soft_17: r.dealer_hits_soft_17 ?? false,
                split_aces: r.split_aces ?? 'play_no_resplit',
                surrender_allowed: r.surrender_allowed ?? false,
                insurance_allowed: r.insurance_allowed ?? false,
              };
            }
          } catch {}
          return {};
        })(),
      }),
    });

    if (!res.ok) {
      let errorDetail = '';
      try {
        const errJson = await res.json();
        errorDetail = JSON.stringify(errJson, null, 2);
      } catch {
        errorDetail = await res.text();
      }
      throw new Error(`Server error ${res.status}: ${errorDetail}`);
    }

    const data = await res.json();
    setOutput(`Success! ${data.num_games} games played. Final balance: ${data.final_balance || 'unknown'}`);

    // Quick save to localStorage for dashboard
    const simResult = {
      date: new Date().toLocaleString(),
      totalHands: data.num_games,
      finalBankroll: data.final_balance || bal + (data.total_profit || 0),
      netProfit: data.total_profit || 0,

        balanceHistory: data.results?.length > 500                      //<---------------------------NEW Fix: Updated results history for history clearing button
  ? data.results.filter((_, idx) => idx % Math.ceil(data.results.length / 500) === 0)
      .map((r) => ({ handNumber: r.hand, balance: r.balance }))
  : data.results?.map((r) => ({ handNumber: r.hand, balance: r.balance })) || [],

trueCountHistory: data.results?.length > 500
  ? data.results.filter((_, idx) => idx % Math.ceil(data.results.length / 500) === 0)
      .map((r) => ({ handNumber: r.hand, trueCount: r.true_count }))
  : data.results?.map((r) => ({ handNumber: r.hand, trueCount: r.true_count })) || [],
    };

    const existing = JSON.parse(localStorage.getItem('blackjackSimResults') || '[]');
    localStorage.setItem('blackjackSimResults', JSON.stringify([...existing, simResult]));

  } catch (err) {
    console.error('Simulation error:', err);  // log full error to console
    setOutput(`Simulation failed: ${err.message}`);
  }
};

  const [resultsData, setResultsData] = useState(null);

  const fetchResults = async () => {
    try {
      const res = await fetch('http://localhost:8000/results');   //<-------------NEW Fix: Updated localhost:8010 with correct 8000
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

//<------------------------------NEW Fix: Updated label text color so text is not same color as background, adjusted spacing between label and input box
// <------------------------------NEW Fix: Fixed overflow negative margin after clicking View Results, can now scroll
  return (
    <div className="app-container" style={{
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    padding: '50px',
    boxSizing: 'border-box'
  }}>
      <h2 style={{ marginTop: '0 0 1.5rem 0', textAlign: 'left', color: '#676767' }}>Simulation Mode</h2>
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem'}}>
        <div>
          <label style={{ marginRight: '0.5rem', color: '#676767' }}>Number of Games:</label>
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
              color: '#ffffff',
              fontSize: '1rem',
              width: '120px',
            }}
          />
        </div>
        <div>
          <label style={{ marginRight: '5.1rem', color: '#676767' }}>Balance:</label>
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
              color: '#ffffff',
              fontSize: '1rem',
              width: '120px',
            }}
          />
        </div>
        <div>
          <label style={{ marginRight: '3.2rem', color: '#676767' }}>Bet Amount:</label>
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
              color: '#ffffff',
              fontSize: '1rem',
              width: '120px',
            }}
          />
        </div>
        <div>
          <label style={{ marginRight: '0.7rem', color: '#676767' }}>Number of Decks:</label>
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
              color: '#ffffff',
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
        <button className="run-btn" onClick={() => setGraphUrl(`http://localhost:8000/graph?t=${new Date().getTime()}`)}>
          View Graph
        </button>
        <div className="results-link" style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a
            href="http://localhost:8000/results"     //<-------------NEW Fix: Updated localhost:8010 with correct 8000
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
