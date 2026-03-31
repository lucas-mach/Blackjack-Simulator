import React, { useState } from 'react';
import './App.css';
import './Simulation.css';

const Simulation = () => {
  const [output, setOutput] = useState('');
  const [numGames, setNumGames] = useState('');
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [numDecks, setNumDecks] = useState('');
  const [graphUrl, setGraphUrl] = useState(null);
  const [isBetBalanceModalOpen, setIsBetBalanceModalOpen] = useState(false);
  const [draftBalance, setDraftBalance] = useState('');
  const [draftBetAmount, setDraftBetAmount] = useState('');


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
    const finalBalance = data.final_balance ?? null;
    const gamesActuallyPlayed = data.results?.length ?? data.num_games;
    const balanceMsg = finalBalance === 0
      ? `You're broke! Ran out of money on game ${gamesActuallyPlayed} of ${data.num_games}.`
      : `Success! ${data.num_games} games played. Final balance: $${finalBalance ?? 'unknown'}`;
    setOutput(balanceMsg);

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

        inputs: {    //<-------------------------NEW Added the original user inputs to the dashboard graphs
        numGames: games,
        initialBalance: bal,
        betAmount: bet,
        numDecks: decks
      }
    };

    const existing = JSON.parse(localStorage.getItem('blackjackSimResults') || '[]');
    localStorage.setItem('blackjackSimResults', JSON.stringify([...existing, simResult]));

  } catch (err) {
    console.error('Simulation error:', err);  // log full error to console
    setOutput(`Simulation failed: ${err.message}`);
  }
};

  const [resultsData, setResultsData] = useState(null);

  const openBetBalanceModal = () => {
    setDraftBalance('');
    setDraftBetAmount('');
    setIsBetBalanceModalOpen(true);
  };

  const closeBetBalanceModal = () => {
    setIsBetBalanceModalOpen(false);
  };

  const saveBetBalance = () => {
    if (draftBalance !== '') {
      setBalance(draftBalance);
    }
    if (draftBetAmount !== '') {
      setBetAmount(draftBetAmount);
    }
    setIsBetBalanceModalOpen(false);
  };

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
    <div className="app-container simulation-root">
      <div className="header-wrap">
        <div className="header-title-wrap">
          <h1 className="simulation-header-title">Simulate</h1>
          <p className="simulation-header-subtitle">Test Strategy Performance</p>
        </div>
        <div className="header-block-wrap">
          <button
            type="button"
            className="bet-edit-btn"
            onClick={openBetBalanceModal}
            aria-label="Edit bet and balance"
          >
            <span className="material-symbols-outlined bet-edit-icon">edit_square</span>
          </button>
        </div>
        <div className="header-block-wrap">
          <p className="simulation-header-subtitle">Bet:</p>
          <h1 className="h1-sub">${betAmount}</h1>
        </div>
        <div className="header-block-wrap">
          <p className="simulation-header-subtitle">Balance:</p>
          <h1 className="h1-sub">${balance}</h1>
        </div>
      </div>
      <div className="section-wrap">
        <div className="section-block-wrap">
          <div className="section-block-title-wrap">
            <h1 className="h1-sub">Options</h1>
            <p>Game Settings</p>
          </div>
          <div className="section-block-content-wrap">
            <label className="simulation-label simulation-label--games">Number of Games:</label>
            <input
              type="number"
              className="simulation-input"
              value={numGames}
              onChange={(e) => setNumGames(e.target.value)}
              placeholder="100"
              min="1"
            />
          </div>
          <div className="section-block-content-wrap">
            <label className="simulation-label simulation-label--decks">Number of Decks:</label>
            <input
              type="number"
              className="simulation-input"
              value={numDecks}
              onChange={(e) => setNumDecks(e.target.value)}
              placeholder="8"
              min="1"
            />
          </div>
        </div>
        <div className="section-block-wrap controls">
          <div className="section-block-title-wrap">
            <h1 className="h1-sub">Control</h1>
            <p>Start and Edit Simulation</p>
          </div>
          <div className="section-block-content-wrap">
            <button className="run-btn" onClick={runRestSimulation}>
              Run Simulation
            </button>
            <button className="graph-btn" onClick={() => setGraphUrl(`http://localhost:8000/graph?t=${new Date().getTime()}`)}>
              View Graph
            </button>
            <button className="results-btn" onClick={fetchResults}>
              View Results
            </button>
          </div>
          <div className="results-link simulation-download-wrap">
            <a
              href="http://localhost:8000/results"     //<-------------NEW Fix: Updated localhost:8010 with correct 8000
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Results (results.csv)
            </a>
          </div>
        </div>
      </div>
      <div className="section-wrap section-wrap--results">
        <div className="section-block-wrap results">
          <div className="section-block-title-wrap">
            <h1 className="h1-sub">Results</h1>
            <p>Game Outcomes</p>
          </div>
          <div className="section-block-content-wrap results-content-wrap">
            <div className="results-info-box">
             {output && <div className="results-output-line">{output}</div>}
             {!output && !resultsData && 'Click "Run Simulation" to start.'}

             {resultsData && resultsData.length > 0 && (
            <div className="results-scroll">
            <table className="simulation-results-table">
              <thead className="simulation-results-thead">
                <tr>
                  {Object.keys(resultsData[0]).map((h, i) => (
                    <th key={i} className="simulation-results-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultsData.map((row, i) => (
                  <tr key={i} className="simulation-results-tr">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="simulation-results-td">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {graphUrl && (
          <div className="simulation-graph-wrap">
            <img src={graphUrl} alt="Simulation Graph" className="simulation-graph-img" />
          </div>
        )}
      </div>
            <div className="results-table-wrap">
              
            </div>
          </div>
        </div>
      </div>
      {isBetBalanceModalOpen && (
        <div className="simulation-modal-overlay" onClick={closeBetBalanceModal}>
          <div className="simulation-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="simulation-modal-title">Edit Bet and Balance</h2>
            <div className="simulation-modal-field">
              <label className="simulation-label">Balance:</label>
              <input
                type="number"
                className="simulation-input"
                value={draftBalance}
                onChange={(e) => setDraftBalance(e.target.value)}
                placeholder="1000"
                min="1"
              />
            </div>
            <div className="simulation-modal-field">
              <label className="simulation-label">Bet Amount:</label>
              <input
                type="number"
                className="simulation-input"
                value={draftBetAmount}
                onChange={(e) => setDraftBetAmount(e.target.value)}
                placeholder="10"
                min="1"
              />
            </div>
            <div className="simulation-modal-actions">
              <button type="button" className="run-btn" onClick={saveBetBalance}>Save</button>
              <button type="button" className="cancel-btn" onClick={closeBetBalanceModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Simulation;
