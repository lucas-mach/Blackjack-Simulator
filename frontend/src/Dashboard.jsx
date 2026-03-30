import React, { useState, useEffect } from 'react';
import ResultsChart from './ResultsChart';

const DEFAULT_RULES = {
  blackjack_payout: '3:2',
  max_splits: 4,
  double_on: 'any',
  double_after_split: true,
  dealer_hits_soft_17: false,
  split_aces: 'no_play',
  surrender_allowed: false,
  insurance_allowed: true,
};

const selectStyle = {
  padding: '6px 10px',
  borderRadius: '4px',
  border: '1px solid #444',
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  fontSize: '0.9rem',
  cursor: 'pointer',
  maxWidth: '260px',
  minWidth: '180px',
};

const labelStyle = {
  color: '#aaa',
  fontSize: '0.9rem',
  minWidth: '220px',
  display: 'inline-block',
};

const Dashboard = () => {
  const [recentSims, setRecentSims] = useState([]);
  const [rules, setRules] = useState(() => {
    try {
      const saved = localStorage.getItem('blackjackRules');
      return saved ? { ...DEFAULT_RULES, ...JSON.parse(saved) } : { ...DEFAULT_RULES };
    } catch {
      return { ...DEFAULT_RULES };
    }
  });

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
        setRecentSims(Array.isArray(parsed) ? parsed.slice(-5) : [parsed]);
      } catch (e) {
        console.error('Failed to parse saved sims', e);
      }
    }
  }, []);

  const updateRule = (key, value) => {
    const updated = { ...rules, [key]: value };
    setRules(updated);
    localStorage.setItem('blackjackRules', JSON.stringify(updated));
  };

  const formatCurrency = (num) => `$${Math.round(num).toLocaleString()}`;

  const RuleRow = ({ label, ruleKey, options }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
      <span style={labelStyle}>{label}</span>
      <select
        style={selectStyle}
        value={String(rules[ruleKey])}
        onChange={(e) => {
          let val = e.target.value;
          if (val === 'true') val = true;
          else if (val === 'false') val = false;
          else if (!isNaN(Number(val)) && ruleKey === 'max_splits') val = Number(val);
          updateRule(ruleKey, val);
        }}
      >
        {options.map(({ value, label }) => (
          <option key={String(value)} value={String(value)}>{label}</option>
        ))}
      </select>
    </div>
  );

  const renderSimCard = (sim, index) => (
    <div style={{
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,255,157,0.1)',
      margin: '0 auto',
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
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: '30px', padding: '20px' }}>
        <h1 style={{ color: '#00ff9d', marginBottom: '15px' }}>
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

      {/* ── Game Rules ── */}
      <div style={{
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '10px',
        padding: '20px 24px',
        marginBottom: '28px',
        boxShadow: '0 4px 12px rgba(0,255,157,0.06)'
      }}>
        <h2 style={{ color: '#00ff9d', marginTop: 0, marginBottom: '16px', fontSize: '1.1rem' }}>
          ⚙️ Game Rules
          <span style={{ color: '#555', fontWeight: 'normal', fontSize: '0.8rem', marginLeft: '10px' }}>
            (applied to both Simulation and Interactive modes)
          </span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '4px 40px' }}>
          <RuleRow
            label="Blackjack Payout"
            ruleKey="blackjack_payout"
            options={[
              { value: '3:2', label: '3:2 (standard)' },
              { value: '6:5', label: '6:5' },
              { value: '1:1', label: '1:1 (even)' },
            ]}
          />
          <RuleRow
            label="Maximum Splits Allowed"
            ruleKey="max_splits"
            options={[
              { value: 1, label: '1 split' },
              { value: 2, label: '2 splits' },
              { value: 3, label: '3 splits' },
              { value: 4, label: '4 splits (standard)' },
              { value: 1000, label: 'Unlimited splits' },
            ]}
          />
          <RuleRow
            label="Double Down Allowed On"
            ruleKey="double_on"
            options={[
              { value: 'any', label: 'Any 2 cards (standard)' },
              { value: '10_11', label: '10 or 11 only' },
            ]}
          />
          <RuleRow
            label="Double After Split"
            ruleKey="double_after_split"
            options={[
              { value: true, label: 'Allowed (standard)' },
              { value: false, label: 'Not allowed' },
            ]}
          />
          <RuleRow
            label="Dealer Soft 17"
            ruleKey="dealer_hits_soft_17"
            options={[
              { value: false, label: 'Dealer stands (standard)' },
              { value: true, label: 'Dealer hits' },
            ]}
          />
          <RuleRow
            label="Split Aces Rule"
            ruleKey="split_aces"
            options={[
              { value: 'no_play', label: 'No play after split aces (standard)' },
              { value: 'play_no_resplit', label: 'Play + no resplit' },
              { value: 'same', label: 'Aces treated same as other cards' },
            ]}
          />
          <RuleRow
            label="Surrender"
            ruleKey="surrender_allowed"
            options={[
              { value: false, label: 'Not allowed (standard)' },
              { value: true, label: 'Allowed' },
            ]}
          />
          <RuleRow
            label="Insurance"
            ruleKey="insurance_allowed"
            options={[
              { value: false, label: 'Not offered' },
              { value: true, label: 'Offered when dealer shows Ace (standard)' },
            ]}
          />
        </div>
      </div>

      {/* ── Simulation History ── */}
      {recentSims.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: '1.2em' }}>
          <p>No simulations run yet.</p>
          <p>Head to Simulation Mode and run a session to see results here!</p>
        </div>
      ) : (
        <>
          {/* Latest simulation — full size at top */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#00ff9d', marginBottom: '15px' }}>
              Latest Session — {recentSims[recentSims.length - 1].date}
            </h2>
            {renderSimCard(recentSims[recentSims.length - 1], recentSims.length - 1)}
          </div>

          {/* Older sessions as collapsible dropdowns */}
          {recentSims.length > 1 && (
            <div>
              <h3 style={{ color: '#aaa', marginBottom: '15px' }}>Previous Sessions</h3>
              {[...recentSims].slice(0, -1).reverse().map((sim, idx) => (
                <details key={idx} style={{ marginBottom: '12px' }}>
                  <summary style={{
                    cursor: 'pointer',
                    background: '#1a1a1a',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    color: '#00ff9d',
                    fontWeight: 'bold',
                    listStyle: 'none',
                  }}>
                    Session {recentSims.length - 1 - idx} — {sim.date}
                  </summary>
                  <div style={{ padding: '20px', background: '#111', borderRadius: '0 0 6px 6px' }}>
                    {renderSimCard(sim, recentSims.length - 2 - idx)}
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