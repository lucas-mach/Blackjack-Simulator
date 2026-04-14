import React, { useState } from 'react';
import './App.css';
import './Simulation.css';

// ── TCC levels exposed in the strategy editor ─────────────────────────────────
const TCC_KEYS = [
  { key: 'tcc_8plus',      label: 'TCC ≥ 8'   },
  { key: 'tcc_7',          label: 'TCC 7'      },
  { key: 'tcc_6',          label: 'TCC 6'      },
  { key: 'tcc_5',          label: 'TCC 5'      },
  { key: 'tcc_4',          label: 'TCC 4'      },
  { key: 'tcc_3',          label: 'TCC 3'      },
  { key: 'tcc_2',          label: 'TCC 2'      },
  { key: 'tcc_0_1',        label: 'TCC 0–1'    },
  { key: 'tcc_neg1',       label: 'TCC −1'     },
  { key: 'tcc_neg2',       label: 'TCC −2'     },
  { key: 'tcc_under_neg2', label: 'TCC < −2'   },
];

const DEFAULT_BET_RAMP = [1, 2, 4, 6, 8, 10, 12];
const BET_RAMP_LABELS  = ['≤ 0', '1', '2', '3', '4', '5', '≥ 6'];

// Maps each TCC strategy key to its index in the 7-slot bet ramp array
const TCC_KEY_TO_RAMP_IDX = {
  tcc_under_neg2: 0, tcc_neg2: 0, tcc_neg1: 0, tcc_0_1: 0,
  tcc_2: 2, tcc_3: 3, tcc_4: 4, tcc_5: 5,
  tcc_6: 6, tcc_7: 6, tcc_8plus: 6,
};

// Cell colour coding
const ACTION_COLORS = {
  H:  '#1a1a1a', S:  '#1f3a5f', D:  '#5c3a00',
  DS: '#5c3a00', R:  '#4a0000', RS: '#4a0000',
  Y:  '#1a3a1a',
};

const Simulation = () => {
  const [output, setOutput] = useState('');
  const [numGames, setNumGames] = useState(100);
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [numDecks, setNumDecks] = useState(8);
  const [graphUrl, setGraphUrl] = useState(null);
  const [isBetBalanceModalOpen, setIsBetBalanceModalOpen] = useState(false);
  const [draftBalance, setDraftBalance] = useState('');
  const [draftBetAmount, setDraftBetAmount] = useState('');

  // ── New optional overrides ────────────────────────────────────────────────
  const [insuranceThreshold, setInsuranceThreshold] = useState('');
  const [useBaseStrategyOnly, setUseBaseStrategyOnly] = useState(false);
  const [betRamp, setBetRamp] = useState([...DEFAULT_BET_RAMP]);
  const [showBetRamp, setShowBetRamp] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  // New row-based strategy editor state
  const [stratRows, setStratRows] = useState([]);       // [{key, label, expanded, cells:{hard,soft,split}}]
  const [stratCache, setStratCache] = useState({});     // {tcc_key: raw backend data}
  const [stratLoading, setStratLoading] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);
  const [addRowKey, setAddRowKey] = useState('tcc_0_1');
  const [addRowFrom, setAddRowFrom] = useState('tcc_0_1');

  const loadStrategyCache = async (tcc_key) => {
    if (stratCache[tcc_key]) return stratCache[tcc_key];
    setStratLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/strategy/${tcc_key}`);
      if (res.ok) {
        const data = await res.json();
        setStratCache((prev) => ({ ...prev, [tcc_key]: data }));
        setStratLoading(false);
        return data;
      }
    } catch {}
    setStratLoading(false);
    return null;
  };

  const toggleRowExpanded = async (idx) => {
    const row = stratRows[idx];
    if (!row.expanded) await loadStrategyCache(row.key);
    setStratRows(prev => prev.map((r, i) => i === idx ? { ...r, expanded: !r.expanded } : r));
  };

  const addStratRow = async () => {
    if (stratRows.find(r => r.key === addRowKey)) return;
    const srcRow = stratRows.find(r => r.key === addRowFrom);
    const newCells = srcRow ? JSON.parse(JSON.stringify(srcRow.cells)) : { hard: {}, soft: {}, split: {} };
    const newLabel = TCC_KEYS.find(t => t.key === addRowKey)?.label || addRowKey;
    const newMult = betRamp[TCC_KEY_TO_RAMP_IDX[addRowKey]] ?? 1;
    setStratRows(prev => {
      const order = TCC_KEYS.map(t => t.key);
      const all = [...prev, { key: addRowKey, label: newLabel, expanded: true, cells: newCells, betMultiplier: newMult }];
      return all.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    });
    setShowAddRow(false);
    await loadStrategyCache(addRowKey);
  };

  const deleteStratRow = (idx) => setStratRows(prev => prev.filter((_, i) => i !== idx));

  const setCellValue = (rowIdx, tab, ck, val) => {
    setStratRows(prev => prev.map((r, i) => i !== rowIdx ? r : {
      ...r, cells: { ...r.cells, [tab]: { ...(r.cells[tab] || {}), [ck]: val } }
    }));
  };

  const restoreDefaults = async () => {
    const rows = TCC_KEYS.map((t) => ({
      key: t.key,
      label: t.label,
      expanded: false,
      cells: { hard: {}, soft: {}, split: {} },
    }));
    setStratRows(rows);
    setStratLoading(true);
    try {
      const pairs = await Promise.all(
        TCC_KEYS.map(async (t) => {
          try {
            const res = await fetch(`http://localhost:8000/strategy/${t.key}`);
            if (!res.ok) return null;
            return [t.key, await res.json()];
          } catch {
            return null;
          }
        })
      );
      const next = {};
      pairs.forEach((p) => {
        if (p) next[p[0]] = p[1];
      });
      setStratCache(next);
    } finally {
      setStratLoading(false);
    }
  };

  const downloadStrategyConfig = () => {
    const cfg = { version: 1, stratRows: stratRows.map(r => ({ key: r.key, label: r.label, cells: r.cells })) };
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'blackjack-strategy.bstrat' });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const uploadStrategyConfig = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const cfg = JSON.parse(ev.target.result);
        const rows = (cfg.stratRows || []).map(r => ({ ...r, expanded: false }));
        setStratRows(rows);
        rows.forEach(r => loadStrategyCache(r.key));
      } catch { alert('Invalid .bstrat file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const computeStrategyOverrides = () => {
    if (stratRows.length === 0) return null;
    const result = {};
    stratRows.forEach(row => {
      const tabData = {};
      ['hard', 'soft', 'split'].forEach(tab => {
        const cells = row.cells[tab] || {};
        if (Object.keys(cells).length > 0)
          tabData[tab] = Object.entries(cells).map(([k, v]) => { const [r, c] = k.split(',').map(Number); return [r, c, v]; });
      });
      if (Object.keys(tabData).length > 0) result[row.key] = tabData;
    });
    return Object.keys(result).length > 0 ? result : null;
  };


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

    // Build effective bet ramp: start from global betRamp, then overlay
    // per-row multipliers from the strategy editor (last-writer-wins per slot)
    const effectiveBetRamp = [...betRamp];
    stratRows.forEach(row => {
      const idx = TCC_KEY_TO_RAMP_IDX[row.key];
      if (idx !== undefined && row.betMultiplier !== undefined) {
        effectiveBetRamp[idx] = row.betMultiplier;
      }
    });

    const res = await fetch('http://localhost:8000/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        num_games: games,
        balance: bal,
        bet_amount: bet,
        num_decks: decks,
        bet_ramp: effectiveBetRamp,
        strategy_overrides: computeStrategyOverrides(),
        insurance_threshold: insuranceThreshold !== '' ? Number(insuranceThreshold) : null,
        use_base_strategy_only: useBaseStrategyOnly,
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
    if (draftBalance !== '') setBalance(Number(draftBalance));
    if (draftBetAmount !== '') setBetAmount(Number(draftBetAmount));
    setIsBetBalanceModalOpen(false);
  };

  const closeStrategyModal = () => setShowStrategy(false);

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
            <p>Start Simulation</p>
          </div>
          <div className="section-block-content-wrap">
            <button className="run-btn" onClick={runRestSimulation}>
              Run Simulation
            </button>
            <button
              type="button"
              className="strategy-btn"
              onClick={() => {
                if (stratRows.length === 0) {
                  setStratRows(
                    TCC_KEYS.map((t) => ({
                      key: t.key,
                      label: t.label,
                      expanded: false,
                      cells: { hard: {}, soft: {}, split: {} },
                    }))
                  );
                  TCC_KEYS.forEach((t) => loadStrategyCache(t.key));
                }
                setShowStrategy(true);
              }}
            >
              Edit Strategy
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

      {showStrategy && (
        <div className="simulation-modal-overlay" onClick={closeStrategyModal}>
          <div
            className="simulation-modal simulation-modal--strategy"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="strategy-editor-title"
          >
            <div className="simulation-strategy-modal-head">
              <h2 id="strategy-editor-title" className="simulation-modal-title">
                Strategy Editor
              </h2>
              <button
                type="button"
                className="simulation-strategy-modal-close"
                onClick={closeStrategyModal}
                aria-label="Close strategy editor"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>

            <div className="simulation-strategy-toolbar">
              <button type="button" className="simulation-strategy-toolbar-btn" onClick={restoreDefaults}>
                Restore Defaults
              </button>
              <button
                type="button"
                className="simulation-strategy-toolbar-btn"
                onClick={() =>
                  setStratRows([
                    {
                      key: 'tcc_0_1',
                      label: 'TCC 0–1 (base)',
                      expanded: false,
                      cells: { hard: {}, soft: {}, split: {} },
                    },
                  ])
                }
              >
                Base Strategy Only
              </button>
              <button
                type="button"
                className="simulation-strategy-toolbar-btn simulation-strategy-toolbar-btn--danger"
                onClick={() => setStratRows([])}
              >
                Clear All
              </button>
              <div className="simulation-strategy-toolbar-spacer" aria-hidden="true" />
              <button type="button" className="simulation-strategy-toolbar-btn" onClick={downloadStrategyConfig}>
                ⬇ Download .bstrat
              </button>
              <label className="simulation-strategy-upload-label">
                ⬆ Upload .bstrat
                <input type="file" accept=".bstrat,.json" hidden onChange={uploadStrategyConfig} />
              </label>
            </div>

            {stratRows.length === 0 && (
              <div style={{ color: '#555', fontSize: '0.85rem', padding: '8px 0' }}>
                No overrides configured — sim uses default Excel strategies. Click &quot;Restore Defaults&quot; or
                &quot;+ Add Strategy Row&quot;.
              </div>
            )}
            {stratRows.map((row, idx) => (
              <div
                key={row.key}
                className="simulation-strategy-tcc-row"
                style={{
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  marginBottom: '6px',
                  overflow: 'hidden',
                }}
              >
                <div className="simulation-strategy-tcc-head">
                  <button
                    type="button"
                    className="simulation-strategy-tcc-toggle"
                    onClick={() => toggleRowExpanded(idx)}
                  >
                    {row.expanded ? '▾' : '▸'} {row.label}
                  </button>
                  {['hard', 'soft', 'split'].some((tab) => Object.keys(row.cells[tab] || {}).length > 0) && (
                    <span style={{ fontSize: '0.68rem', color: '#f5a623' }}>✏ edited</span>
                  )}
                  <button
                    type="button"
                    className="simulation-strategy-row-remove"
                    onClick={() => deleteStratRow(idx)}
                  >
                    ✕ Remove
                  </button>
                </div>
                {row.expanded &&
                  stratCache[row.key] &&
                  (() => {
                    const d = stratCache[row.key];
                    return (
                      <div style={{ padding: '8px', overflowX: 'auto' }}>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                          {['hard', 'soft', 'split'].map((tab) => {
                            const tbl = d[tab];
                            const rLbls = d.row_labels[tab];
                            const cLbls = d.col_labels;
                            const cells = row.cells[tab] || {};
                            const OPTS = tab === 'split' ? ['Y', 'N'] : ['H', 'S', 'D', 'DS', 'R', 'RS'];
                            return (
                              <div key={tab}>
                                <div
                                  style={{
                                    color: '#777',
                                    fontSize: '0.65rem',
                                    textAlign: 'center',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    marginBottom: '2px',
                                  }}
                                >
                                  {tab}
                                </div>
                                <table style={{ borderCollapse: 'collapse', fontSize: '0.6rem' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ padding: '1px 3px', color: '#444' }} />
                                      {cLbls.map((c) => (
                                        <th
                                          key={c}
                                          style={{
                                            padding: '1px 2px',
                                            color: '#666',
                                            fontWeight: 'normal',
                                            minWidth: '26px',
                                          }}
                                        >
                                          {c}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tbl.map((tRow, ri) => (
                                      <tr key={ri}>
                                        <td
                                          style={{
                                            padding: '1px 3px',
                                            color: '#777',
                                            fontWeight: 'bold',
                                            fontSize: '0.58rem',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {rLbls[ri]}
                                        </td>
                                        {tRow.map((cell, ci) => {
                                          const ck = `${ri},${ci}`;
                                          const val = cells[ck] ?? (cell ? String(cell).toUpperCase() : 'H');
                                          return (
                                            <td
                                              key={ci}
                                              style={{
                                                padding: '1px',
                                                backgroundColor: ACTION_COLORS[val] || '#1a1a1a',
                                              }}
                                            >
                                              <select
                                                value={val}
                                                onChange={(e) => setCellValue(idx, tab, ck, e.target.value)}
                                                style={{
                                                  background: 'transparent',
                                                  border: 'none',
                                                  color: '#ddd',
                                                  fontSize: '0.6rem',
                                                  cursor: 'pointer',
                                                  width: '26px',
                                                  padding: 0,
                                                }}
                                              >
                                                {OPTS.map((o) => (
                                                  <option key={o} value={o} style={{ background: '#1a1a1a' }}>
                                                    {o}
                                                  </option>
                                                ))}
                                              </select>
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                {row.expanded && !stratCache[row.key] && (
                  <div style={{ padding: '8px', color: '#555', fontSize: '0.8rem' }}>Loading strategy data…</div>
                )}
              </div>
            ))}

            <div style={{ marginTop: '8px' }}>
              {!showAddRow ? (
                <button
                  type="button"
                  onClick={() => setShowAddRow(true)}
                  style={{
                    background: 'none',
                    border: '1px dashed #333',
                    color: '#555',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    padding: '4px 12px',
                    borderRadius: '4px',
                  }}
                >
                  + Add Strategy Row
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    padding: '8px 10px',
                    background: '#161616',
                    borderRadius: '6px',
                    border: '1px solid #2a2a2a',
                  }}
                >
                  <label style={{ color: '#888', fontSize: '0.78rem' }}>Level:</label>
                  <select
                    value={addRowKey}
                    onChange={(e) => setAddRowKey(e.target.value)}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #444',
                      background: '#222',
                      color: '#fff',
                      fontSize: '0.78rem',
                    }}
                  >
                    {TCC_KEYS.filter((t) => !stratRows.find((r) => r.key === t.key)).map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <label style={{ color: '#888', fontSize: '0.78rem' }}>Copy from:</label>
                  <select
                    value={addRowFrom}
                    onChange={(e) => setAddRowFrom(e.target.value)}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #444',
                      background: '#222',
                      color: '#fff',
                      fontSize: '0.78rem',
                    }}
                  >
                    {TCC_KEYS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addStratRow}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '4px',
                      background: '#00ff9d',
                      color: '#000',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 'bold',
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRow(false)}
                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.78rem' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {stratLoading && (
              <div style={{ color: '#777', fontSize: '0.78rem', marginTop: '4px' }}>Loading strategy data…</div>
            )}

            <div className="simulation-modal-actions">
              <button type="button" className="run-btn" onClick={closeStrategyModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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
                placeholder={String(balance)}
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
                placeholder={String(betAmount)}
                min="1"
              />
            </div>
            <div className="simulation-modal-actions">
              <button type="button" className="run-btn" onClick={saveBetBalance}>
                Save
              </button>
              <button type="button" className="cancel-btn" onClick={closeBetBalanceModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Simulation;
