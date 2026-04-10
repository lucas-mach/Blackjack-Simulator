import React, { useState, useEffect } from 'react';
import ResultsChart from './ResultsChart';
import './App.css';
import './Simulation.css';
import './Dashboard.css';

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

const Dashboard = () => {
  const [recentSims, setRecentSims] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [pendingRules, setPendingRules] = useState(null);
  const [dragOver, setDragOver] = useState(false);
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

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blackjack-rules.bjconfig';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = (e.dataTransfer?.files ?? e.target.files)?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setPendingRules({ ...DEFAULT_RULES, ...parsed });
      } catch { alert('Invalid config file.'); }
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    if (!pendingRules) return;
    setRules(pendingRules);
    localStorage.setItem('blackjackRules', JSON.stringify(pendingRules));
    setPendingRules(null);
    setShowUpload(false);
  };

  const RuleRow = ({ label, ruleKey, options }) => (
    <div className="dashboard-rule-row">
      <span className="dashboard-rule-label">{label}</span>
      <select
        className="dashboard-select"
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
    <div className="dashboard-session-card">
      <h2 className="dashboard-session-title">
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

      <div className="dashboard-session-stats">
        <p><strong>Hands Played:</strong> {sim.totalHands || 'N/A'}</p>
        <p><strong>Final Bankroll:</strong> {formatCurrency(sim.finalBankroll || 0)}</p>
        <p><strong>Net Profit:</strong> <span className={(sim.netProfit || 0) >= 0 ? 'dashboard-profit-positive' : 'dashboard-profit-negative'}>
          {formatCurrency(sim.netProfit || 0)}
        </span></p>
        {sim.winRate && <p><strong>Win Rate:</strong> {sim.winRate.toFixed(1)}%</p>}
      </div>

      <div className="dashboard-session-inputs">
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
    <div className="app-container dashboard-root">
      <div className="header-wrap dashboard-header-wrap">
        <div className="header-title-wrap">
          <h1 className="simulation-header-title">Dashboard</h1>
          <p className="simulation-header-subtitle">Track sessions and configure game rules</p>
        </div>
        <div className="header-block-wrap dashboard-header-action">
          <button type="button" className="results-btn dashboard-clear-btn" onClick={clearDashboard}>
            Clear All Simulations
          </button>
        </div>
      </div>

      <div className="section-wrap section-wrap--results">
        <section className="section-block-wrap controls dashboard-rules-panel">
          <div className="section-block-title-wrap dashboard-panel-head">
            <div className="dashboard-panel-head-text">
              <h1 className="h1-sub dashboard-panel-title">
                <span className="material-symbols-outlined dashboard-panel-icon" aria-hidden>settings</span>
                Game Rules
              </h1>
              <p>(applied to both Simulation and Interactive modes)</p>
            </div>
            <div className="dashboard-rule-actions">
              <button onClick={handleDownload} title="Download rules as .bjconfig" className="results-btn dashboard-tiny-btn">
                Export
              </button>
              <button onClick={() => { setShowUpload(v => !v); setPendingRules(null); }} title="Upload a .bjconfig file" className="results-btn dashboard-tiny-btn">
                Import
              </button>
            </div>
          </div>
          {showUpload && (
            <div className="dashboard-upload-wrap">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                className={`dashboard-dropzone ${dragOver ? 'is-dragover' : ''}`}
                onClick={() => document.getElementById('bjconfig-input').click()}
              >
                {pendingRules
                  ? 'File loaded - click Confirm to apply'
                  : 'Drop a .bjconfig file here, or click to browse'}
                <input id="bjconfig-input" type="file" accept=".bjconfig,.json" hidden onChange={handleFileDrop} />
              </div>
              {pendingRules && (
                <button onClick={handleConfirm} className="run-btn dashboard-confirm-btn">
                  Confirm
                </button>
              )}
            </div>
          )}
          <div className="dashboard-rules-grid">
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
        </section>
      </div>

      <div className="section-wrap section-wrap--results">
        <section className="section-block-wrap results dashboard-results-panel">
          <div className="section-block-title-wrap">
            <h1 className="h1-sub">Results</h1>
            <p>Saved simulation outcomes</p>
          </div>

          {recentSims.length === 0 ? (
            <div className="dashboard-empty">
              <p>No simulations run yet.</p>
              <p>Head to Simulation Mode and run a session to see results here.</p>
            </div>
          ) : (
            <div className="dashboard-results-list">
              <div className="dashboard-latest-wrap">
                <h2 className="dashboard-subheading">Latest Session - {recentSims[recentSims.length - 1].date}</h2>
                {renderSimCard(recentSims[recentSims.length - 1], recentSims.length - 1)}
              </div>

              {recentSims.length > 1 && (
                <div className="dashboard-history-wrap">
                  <h3 className="dashboard-history-title">Previous Sessions</h3>
                  {[...recentSims].slice(0, -1).reverse().map((sim, idx) => (
                    <details key={idx} className="dashboard-history-item">
                      <summary className="dashboard-history-summary">
                        Session {recentSims.length - 1 - idx} - {sim.date}
                      </summary>
                      <div className="dashboard-history-content">
                        {renderSimCard(sim, recentSims.length - 2 - idx)}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;