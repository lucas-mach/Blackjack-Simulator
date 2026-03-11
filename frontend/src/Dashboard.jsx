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
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Expecting array of sim objects; take last 3-5
        setRecentSims(Array.isArray(parsed) ? parsed.slice(-5) : [parsed]);
      } catch (e) {
        console.error('Failed to parse saved sims', e);
      }
    }
  }, []);

  const formatCurrency = (num) => `$${Math.round(num).toLocaleString()}`;

  return (
      <div style={{padding: '20px', maxWidth: '1400px', margin: '0 auto'}}>
        <h1 style={{color: '#00ff9d', textAlign: 'center', marginBottom: '30px'}}>
          Blackjack Simulation Dashboard
        </h1>

        <div style={{textAlign: 'center', marginBottom: '20px'}}>
          <button
              onClick={clearDashboard}
              style={{
                background: '#ff4d4d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
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
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px'}}>
              {recentSims.map((sim, index) => (
                  <div
                      key={index}
                      style={{
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '10px',
                        padding: '20px',
                        boxShadow: '0 4px 12px rgba(0,255,157,0.1)'
                      }}
                  >
                    <h2 style={{color: '#00ff9d', marginBottom: '15px'}}>
                      Session {index + 1} {sim.date ? `- ${sim.date}` : ''}
                    </h2>

                    {sim.balanceHistory && (
                        <ResultsChart
                            data={sim.balanceHistory}
                            title="Bankroll Over Time"
                            dataKey="balance"
                            xKey="handNumber"
                        />
                    )}

                    {sim.trueCountHistory && (
                        <ResultsChart
                            data={sim.trueCountHistory}
                            title="True Count Timeline"
                            dataKey="trueCount"
                            xKey="handNumber"
                        />
                    )}

                    <div style={{marginTop: '20px', color: '#ddd'}}>
                      <p><strong>Hands Played:</strong> {sim.totalHands || 'N/A'}</p>
                      <p><strong>Final Bankroll:</strong> {formatCurrency(sim.finalBankroll || 0)}</p>
                      <p><strong>Net Profit:</strong> <span style={{color: sim.netProfit >= 0 ? '#00ff9d' : '#ff4d4d'}}>
                  {formatCurrency(sim.netProfit || 0)}
                </span></p>
                      {sim.winRate && <p><strong>Win Rate:</strong> {sim.winRate.toFixed(1)}%</p>}
                    </div>
                  </div>
              ))}
            </div>
        )}
      </div>
  );
};

export default Dashboard;