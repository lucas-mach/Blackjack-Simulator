import React, { useState, useEffect, useRef } from 'react';
import './Terminal.css';
import Card from './Card';

const Terminal = ({ autoSelect = true, onGameComplete = () => {} }) => {
  const [connected, setConnected] = useState(false);
  const [playerHand, setPlayerHand] = useState({cards: [], value: 0});
  const [dealerHand, setDealerHand] = useState({cards: [], value: 0});
  const [actions, setActions] = useState([]);
  const [prompt, setPrompt] = useState(null);
  const [promptInput, setPromptInput] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(10);
  const [editingBet, setEditingBet] = useState(false);
  const [editBetValue, setEditBetValue] = useState(bet);

  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8010/ws/game');

    ws.current.onopen = () => {
      setConnected(true);
      // Auto-select console mode for interactive simulation if autoSelect is enabled
      if (autoSelect) {
        try {
          ws.current.send('1');
        } catch (e) {}
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'text':
            // keep text messages off the main UI; ignore or could show a small toast
            break;
          case 'prompt':
            setPrompt(msg.text);
            setPromptInput('');
            break;
          case 'actions':
            setActions(msg.actions || []);
            break;
          case 'hand':
            if (msg.owner === 'player') setPlayerHand({cards: msg.cards || [], value: msg.value || 0, faceDown: false});
            else setDealerHand({cards: msg.cards || [], value: msg.value || 0, faceDown: false});
            break;
          case 'card_shown':
            if (msg.card) setDealerHand({cards: [msg.card], value: msg.card && msg.card.value ? msg.card.value : 0, faceDown: msg.faceDown || false});
            else setDealerHand({cards: [], value: 0, faceDown: false});
            break;
          case 'state':
            // optional structured state (balance/bet)
            if (msg.balance !== undefined) setBalance(msg.balance);
            if (msg.bet !== undefined) setBet(msg.bet);
            break;
          case 'result':
            // {type:'result', outcome:'win'|'loss'|'push'|'split', profit: N}
            setLastResult(msg);
            // Trigger game complete callback after short delay so result banner displays
            setTimeout(() => onGameComplete(), 4500);
            // auto-clear after 4 seconds
            try {
              setTimeout(() => setLastResult(null), 4000);
            } catch (e) {}
            break;
          default:
            break;
        }
      } catch (e) {
        // plain text fallback ignored
      }
    };

    ws.current.onclose = () => {
      setConnected(false);
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const sendAction = (code) => {
    if (ws.current && connected) {
      ws.current.send(code);
    }
    setActions([]);
  };

  const handlePlay = () => {
    if (!ws.current || !connected) return;
    try {
      ws.current.send(String(bet));
    } catch (e) {}
    // clear any prompt/UI state related to betting
    setPrompt(null);
  };

  const startEditBet = () => {
    setEditBetValue(bet);
    setEditingBet(true);
  };

  const saveEditBet = () => {
    const v = parseInt(editBetValue, 10);
    if (!isNaN(v) && v >= 0) {
      setBet(v);
    }
    setEditingBet(false);
  };

  const submitPrompt = () => {
    if (ws.current && connected) {
      ws.current.send(promptInput);
    }
    setPrompt(null);
    setPromptInput('');
  };

  return (
    <div className="terminal-container">
      <div className="top-bar">
        <div className="bet-display">BET: <span className="amount">€{bet}</span></div>
        <div className="balance-display">BALANCE: <span className="amount">€{balance}</span></div>
      </div>

      <div className="dealer-area">
        <div className="dealer-label">Dealer</div>
        <div className="dealer-value">Value: {dealerHand.value}</div>
        <div className="dealer-cards">
            {dealerHand.cards.map((c, i) => (
              <Card key={i} rank={c.rank} suit={c.suit} />
            ))}
            {dealerHand.faceDown && (
              <img src="/cards/face-down.svg" alt="face-down" className="face-down-card" />
            )}
        </div>
      </div>

      <div className="table-center">
        {/* Center message area (rules, scores) */}
      </div>

      <div className="player-area">
        <div className="player-hands">
          <div className="player-value">Value: {playerHand.value}</div>
          <div className="hand-cards">
            {playerHand.cards.map((c, i) => (
              <Card key={i} rank={c.rank} suit={c.suit} />
            ))}
          </div>
        </div>

        <div className="controls">
          <div className="control-left">
            {actions.find(a => a.code === 's') && (
              <button className="control-btn stand" onClick={() => sendAction('s')}>Stand</button>
            )}
            {actions.find(a => a.code === 'v') && (
              <button className="control-btn split" onClick={() => sendAction('v')}>Split</button>
            )}
          </div>
          <div className="control-right">
            {actions.find(a => a.code === 'd') && (
              <button className="control-btn double" onClick={() => sendAction('d')}>Double</button>
            )}
            {actions.find(a => a.code === 'h') && (
              <button className="control-btn hit" onClick={() => sendAction('h')}>Hit</button>
            )}
          </div>
        </div>

        <div className="bet-controls">
          {!editingBet ? (
            <>
              <button className="small-btn" onClick={startEditBet}>Edit Bet</button>
              <button className="small-btn play" onClick={handlePlay} disabled={!connected || actions.length > 0}>Play</button>
            </>
          ) : (
            <span className="bet-edit-row">
              <input className="bet-edit-input" value={editBetValue} onChange={(e) => setEditBetValue(e.target.value)} />
              <button className="small-btn" onClick={saveEditBet}>Save</button>
            </span>
          )}
        </div>
      </div>
      
      {lastResult && (
        <div className={`result-banner ${lastResult.outcome}`}>
          {lastResult.outcome === 'win' && <div>YOU WIN! (+{lastResult.profit})</div>}
          {lastResult.outcome === 'loss' && <div>YOU LOSE! ({lastResult.profit})</div>}
          {lastResult.outcome === 'push' && <div>PUSH</div>}
          {lastResult.outcome === 'split' && <div>SPLIT HANDS</div>}
        </div>
      )}
    </div>
  );
};

export default Terminal;
