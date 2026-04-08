import React, { useState } from 'react';
import ResultsChart from './ResultsChart';
import './App.css';

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

// Cell colour coding
const ACTION_COLORS = {
  H:  '#1a1a1a', S:  '#1f3a5f', D:  '#5c3a00',
  DS: '#5c3a00', R:  '#4a0000', RS: '#4a0000',
  Y:  '#1a3a1a',
};

const TOOL_BTN = {
  padding: '3px 10px', fontSize: '0.78rem', borderRadius: '4px',
  border: '1px solid #444', background: '#222', color: '#aaa',
  cursor: 'pointer', whiteSpace: 'nowrap',
};


const Simulation = () => {
  const [output, setOutput] = useState('');
  const [numGames, setNumGames] = useState(200);
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [numDecks, setNumDecks] = useState(8);
  const [showGraph, setShowGraph] = useState(false);

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
        setStratCache(prev => ({ ...prev, [tcc_key]: data }));
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
    setStratRows(prev => {
      const order = TCC_KEYS.map(t => t.key);
      const all = [...prev, { key: addRowKey, label: newLabel, expanded: true, cells: newCells }];
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

  const restoreDefaults = () => {
    setStratRows(TCC_KEYS.map(t => ({ key: t.key, label: t.label, expanded: false, cells: { hard: {}, soft: {}, split: {} } })));
    TCC_KEYS.forEach(t => loadStrategyCache(t.key));
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

    const res = await fetch('http://localhost:8000/simulate', {  //<-------------NEW Fix: Updated localhost:8010 with correct 8000
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        num_games: games,
        balance: bal,
        bet_amount: bet,
        num_decks: decks,
        // new optional overrides (only sent if set)
        bet_ramp: betRamp,
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
      {/* ── NEW: Advanced simulation controls ─────────────────────────────── */}
      {/* Insurance threshold */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ color: '#676767' }}>Insurance when TCC ≥</label>
        <input
          type="number" placeholder="disabled"
          value={insuranceThreshold}
          onChange={e => setInsuranceThreshold(e.target.value)}
          style={{ width: '90px', padding: '6px 10px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#1a1a1a', color: '#fff' }}
        />
        <span style={{ color: '#555', fontSize: '0.8rem' }}>(leave blank to disable)</span>
        <label style={{ marginLeft: '1.5rem', color: '#676767', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input type="checkbox" checked={useBaseStrategyOnly} onChange={e => setUseBaseStrategyOnly(e.target.checked)} />
          Base strategy only (ignore TCC deviations)
        </label>
      </div>

      {/* Bet Ramp Editor */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setShowBetRamp(v => !v)}
          style={{ background: 'none', border: 'none', color: '#00ff9d', cursor: 'pointer', fontSize: '0.95rem', padding: 0 }}>
          {showBetRamp ? '▾' : '▸'} Bet Ramp Editor
        </button>
        {showBetRamp && (
          <div style={{ marginTop: '8px', display: 'inline-block' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 10px', color: '#aaa', textAlign: 'left' }}>TCC</th>
                  <th style={{ padding: '4px 10px', color: '#aaa' }}>Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {BET_RAMP_LABELS.map((lbl, i) => (
                  <tr key={i}>
                    <td style={{ padding: '3px 10px', color: '#ccc' }}>{lbl}</td>
                    <td style={{ padding: '3px 10px' }}>
                      <input type="number" min="0" step="1"
                        value={betRamp[i]}
                        onChange={e => setBetRamp(prev => { const r=[...prev]; r[i]=Number(e.target.value); return r; })}
                        style={{ width: '60px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#1a1a1a', color: '#fff', textAlign: 'center' }}
                      />
                      <span style={{ color: '#555', marginLeft: '4px' }}>×</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setBetRamp([...DEFAULT_BET_RAMP])}
              style={{ marginTop: '6px', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>
              Reset to default
            </button>
          </div>
        )}
      </div>

      {/* Strategy Editor ───────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => {
          if (!showStrategy && stratRows.length === 0) {
            // Auto-populate all TCC levels with default (empty overrides) on first open
            setStratRows(TCC_KEYS.map(t => ({ key: t.key, label: t.label, expanded: false, cells: { hard: {}, soft: {}, split: {} } })));
            TCC_KEYS.forEach(t => loadStrategyCache(t.key));
          }
          setShowStrategy(v => !v);
        }}
          style={{ background: 'none', border: 'none', color: '#00ff9d', cursor: 'pointer', fontSize: '0.95rem', padding: 0 }}>
          {showStrategy ? '▾' : '▸'} Strategy Editor
        </button>
        {showStrategy && (
          <div style={{ marginTop: '10px' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
              <button onClick={restoreDefaults} style={TOOL_BTN}>Restore Defaults</button>
              <button onClick={() => setStratRows([{ key: 'tcc_0_1', label: 'TCC 0–1 (base)', expanded: false, cells: { hard: {}, soft: {}, split: {} } }])}
                style={TOOL_BTN}>Base Strategy Only</button>
              <button onClick={() => setStratRows([])} style={{ ...TOOL_BTN, color: '#ff6b6b' }}>Clear All</button>
              <button onClick={downloadStrategyConfig} style={{ ...TOOL_BTN, marginLeft: 'auto' }}>⬇ Download .bstrat</button>
              <label style={{ ...TOOL_BTN, cursor: 'pointer' }}>⬆ Upload .bstrat
                <input type="file" accept=".bstrat,.json" hidden onChange={uploadStrategyConfig} />
              </label>
            </div>

            {/* Row list */}
            {stratRows.length === 0 && (
              <div style={{ color: '#555', fontSize: '0.85rem', padding: '8px 0' }}>
                No overrides configured — sim uses default Excel strategies. Click “Restore Defaults” or “+ Add Row”.
              </div>
            )}
            {stratRows.map((row, idx) => (
              <div key={row.key} style={{ border: '1px solid #2a2a2a', borderRadius: '6px', marginBottom: '6px', overflow: 'hidden' }}>
                {/* Row header */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', background: '#161616', gap: '8px' }}>
                  <button onClick={() => toggleRowExpanded(idx)}
                    style={{ background: 'none', border: 'none', color: '#00ff9d', cursor: 'pointer', fontSize: '0.85rem', padding: 0, fontWeight: 'bold' }}>
                    {row.expanded ? '▾' : '▸'} {row.label}
                  </button>
                  {['hard','soft','split'].some(tab => Object.keys(row.cells[tab]||{}).length > 0) &&
                    <span style={{ fontSize: '0.68rem', color: '#f5a623' }}>✏ edited</span>}
                  <button onClick={() => deleteStratRow(idx)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.8rem' }}>
                    ✕ Remove
                  </button>
                </div>
                {/* Tables: all 3 side by side */}
                {row.expanded && stratCache[row.key] && (() => {
                  const d = stratCache[row.key];
                  return (
                    <div style={{ padding: '8px', overflowX: 'auto' }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        {['hard','soft','split'].map(tab => {
                          const tbl = d[tab];
                          const rLbls = d.row_labels[tab];
                          const cLbls = d.col_labels;
                          const cells = row.cells[tab] || {};
                          const OPTS = tab === 'split' ? ['Y','N'] : ['H','S','D','DS','R','RS'];
                          return (
                            <div key={tab}>
                              <div style={{ color: '#777', fontSize: '0.65rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{tab}</div>
                              <table style={{ borderCollapse: 'collapse', fontSize: '0.6rem' }}>
                                <thead>
                                  <tr>
                                    <th style={{ padding: '1px 3px', color: '#444' }}></th>
                                    {cLbls.map(c => <th key={c} style={{ padding: '1px 2px', color: '#666', fontWeight: 'normal', minWidth: '26px' }}>{c}</th>)}
                                  </tr>
                                </thead>
                                <tbody>
                                  {tbl.map((tRow, ri) => (
                                    <tr key={ri}>
                                      <td style={{ padding: '1px 3px', color: '#777', fontWeight: 'bold', fontSize: '0.58rem', whiteSpace: 'nowrap' }}>{rLbls[ri]}</td>
                                      {tRow.map((cell, ci) => {
                                        const ck = `${ri},${ci}`;
                                        const val = cells[ck] ?? (cell ? String(cell).toUpperCase() : 'H');
                                        return (
                                          <td key={ci} style={{ padding: '1px', backgroundColor: ACTION_COLORS[val] || '#1a1a1a' }}>
                                            <select value={val} onChange={e => setCellValue(idx, tab, ck, e.target.value)}
                                              style={{ background: 'transparent', border: 'none', color: '#ddd', fontSize: '0.6rem', cursor: 'pointer', width: '26px', padding: 0 }}>
                                              {OPTS.map(o => <option key={o} value={o} style={{ background: '#1a1a1a' }}>{o}</option>)}
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

            {/* Add Row */}
            <div style={{ marginTop: '8px' }}>
              {!showAddRow ? (
                <button onClick={() => setShowAddRow(true)}
                  style={{ background: 'none', border: '1px dashed #333', color: '#555', cursor: 'pointer', fontSize: '0.82rem', padding: '4px 12px', borderRadius: '4px' }}>
                  + Add Strategy Row
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', background: '#161616', borderRadius: '6px', border: '1px solid #2a2a2a' }}>
                  <label style={{ color: '#888', fontSize: '0.78rem' }}>Level:</label>
                  <select value={addRowKey} onChange={e => setAddRowKey(e.target.value)}
                    style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff', fontSize: '0.78rem' }}>
                    {TCC_KEYS.filter(t => !stratRows.find(r => r.key === t.key)).map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                  <label style={{ color: '#888', fontSize: '0.78rem' }}>Copy from:</label>
                  <select value={addRowFrom} onChange={e => setAddRowFrom(e.target.value)}
                    style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff', fontSize: '0.78rem' }}>
                    {TCC_KEYS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  <button onClick={addStratRow}
                    style={{ padding: '3px 10px', borderRadius: '4px', background: '#00ff9d', color: '#000', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>Add</button>
                  <button onClick={() => setShowAddRow(false)}
                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.78rem' }}>Cancel</button>
                </div>
              )}
            </div>
            {stratLoading && <div style={{ color: '#777', fontSize: '0.78rem', marginTop: '4px' }}>Loading strategy data…</div>}
          </div>
        )}
      </div>
      {/* ── end advanced controls ──────────────────────────────────────────── */}

      <div className="controls">
        <button className="run-btn" onClick={runRestSimulation}>
          Run Simulation (REST)
        </button>
        <button className="run-btn" onClick={fetchResults}>
          View Results (on webpage)
        </button>
        <button className="run-btn" onClick={() => setShowGraph(v => !v)}>
          {showGraph ? 'Hide Graph' : 'View Graph'}
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
      {showGraph && (() => {
        const saved = localStorage.getItem('blackjackSimResults');
        let latestSim = null;
        try { const arr = JSON.parse(saved || '[]'); latestSim = arr.length > 0 ? arr[arr.length - 1] : null; } catch {}
        if (!latestSim) return (
          <div style={{ marginTop: '1.5rem', color: '#555', fontSize: '0.9rem', textAlign: 'center' }}>
            No simulation data yet — run a simulation first.
          </div>
        );
        return (
          <div style={{ marginTop: '1.5rem' }}>
            {latestSim.balanceHistory && (
              <ResultsChart
                data={latestSim.balanceHistory}
                title="Bankroll Over Time"
                dataKey="balance"
                xKey="handNumber"
                yLabel="Balance ($)"
                xLabel="Hand Number"
              />
            )}
            {latestSim.trueCountHistory && (
              <ResultsChart
                data={latestSim.trueCountHistory}
                title="True Count Timeline"
                dataKey="trueCount"
                xKey="handNumber"
                yLabel="True Count"
                xLabel="Hand Number"
              />
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default Simulation;
