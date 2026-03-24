import React, { useState, useEffect } from 'react';
import ResultsChart from './ResultsChart';

const Dashboard = () => {
  const [recentSims, setRecentSims] = useState([]);

  const clearDashboard = () => {
  if (window.confirm("Clear all saved simulations? This cannot be undone.")) {
    localStorage.removeItem('blackjackSimResults');
    setRecentSims([]);
  }
};

  useEffect(() => {
    const saved = localStorage.getItem('blackjackSimResults');
    //setRecentSims(saved.slice(-5).reverse());
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Expecting array of sim objects; take last 3-5
        setRecentSims(Array.isArray(parsed) ? parsed.slice(-5).reverse() : [parsed]);    //<----------------NEW Fix: Now shows most recent sim first
      } catch (e) {
        console.error('Failed to parse saved sims', e);
      }
    }
  }, []);

  const formatCurrency = (num) => `$${Math.round(num).toLocaleString()}`;

  const renderSimCard = (sim, index) => (
  <div style={{
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,255,157,0.1)',
    margin: '0 auto',       //<-------------------------------TODO Fix: centering dashboard content
    maxWidth: '900px'
  }}>
    <h2 style={{ color: '#00ff9d', marginBottom: '15px', textAlign: 'center' }}>
      Session {index + 1} {sim.date ? `- ${sim.date}` : ''}
    </h2>

    {sim.balanceHistory && (
      <ResultsChart
        data={sim.balanceHistory}
        title="Bankroll Over Time"
        dataKey="balance"
        xKey="handNumber"
        yLabel="Balance ($)"
        xLabel="Hand Number"
      />
    )}

    {sim.trueCountHistory && (
      <ResultsChart
        data={sim.trueCountHistory}
        title="True Count Timeline"
        dataKey="trueCount"
        xKey="handNumber"
        yLabel="True Count"
        xLabel="Hand Number"
      />
    )}

      <div style={{ marginTop: '20px', color: '#ddd' }}>
        <p><strong>Hands Played:</strong> {sim.totalHands || 'N/A'}</p>
        <p><strong>Final Bankroll:</strong> {formatCurrency(sim.finalBankroll || 0)}</p>
        <p><strong>Net Profit:</strong> <span style={{ color: (sim.netProfit || 0) >= 0 ? '#00ff9d' : '#ff4d4d' }}>
          {formatCurrency(sim.netProfit || 0)}
        </span></p>
        {sim.winRate && <p><strong>Win Rate:</strong> {sim.winRate.toFixed(1)}%</p>}
      </div>

      {}
      <div style={{
        marginTop: '25px',
        paddingTop: '15px',
        borderTop: '1px solid #333',
        fontSize: '0.95rem',
        color: '#aaa'
      }}>
        <strong>Original Inputs:</strong><br />
        {sim.inputs ? (
          <>
            {sim.inputs.numGames} games &nbsp;•&nbsp;
            ${sim.inputs.initialBalance} starting balance &nbsp;•&nbsp;
            Bet ${sim.inputs.betAmount} &nbsp;•&nbsp;
            {sim.inputs.numDecks} decks
          </>
        ) : (
          'Inputs not saved for this older session'
        )}
      </div>
    </div>
  );

  return (
      <div style={{padding: '20px', maxWidth: '1400px', margin: '0 auto'}}>

          <div style={{textAlign: 'center', marginBottom: '30px', padding: '20px'}}>
              <h1 style={{color: '#00ff9d', marginBottom: '15px'}}>
                  Blackjack Simulation Dashboard
              </h1>
              <button
                  onClick={clearDashboard}
                  style={{
                      background: '#ff4d4d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                  }}
              >
                  Clear All Simulations
              </button>
          </div>

          {recentSims.length === 0 ? (
              <div style={{textAlign: 'center', color: '#aaa', fontSize: '1.2em'}}>
                  <p>No simulations run yet.</p>
                  <p>Head to Simulation Mode and run a session to see results here!</p>
              </div>
          ) : (
              <>
                  {/* Latest simulation — full size at the top */}
                  <div style={{marginBottom: '40px'}}>
                      <h2 style={{color: '#00ff9d', marginBottom: '15px'}}>
                          Latest Session — {recentSims[0].date}
                      </h2>
                      {renderSimCard(recentSims[0], 0)}
                  </div>

                  {/* Older sessions as collapsible dropdowns */}
                  {recentSims.length > 1 && (
                      <div>
                          <h3 style={{color: '#aaa', marginBottom: '15px'}}>Previous Sessions</h3>
                          {recentSims.slice(1).map((sim, idx) => (
                              <details key={idx} style={{marginBottom: '12px'}}>
                                  <summary style={{
                                      cursor: 'pointer',
                                      background: '#1a1a1a',
                                      padding: '12px 16px',
                                      borderRadius: '6px',
                                      color: '#00ff9d',
                                      fontWeight: 'bold'
                                  }}>
                                      Session {idx + 2} — {sim.date}
                                  </summary>
                                  <div style={{padding: '20px', background: '#111', borderRadius: '0 0 6px 6px'}}>
                                      {renderSimCard(sim, idx + 1)}
                                  </div>
                              </details>
                          ))}
                      </div>
                  )}
              </>
          )}
      </div>
  );
};

export default Dashboard;