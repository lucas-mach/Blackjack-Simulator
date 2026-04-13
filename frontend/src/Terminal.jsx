import React, { useState, useEffect, useRef } from 'react';
import './Terminal.css';
import Card from './Card';

const ACTION_ORDER = ['s', 'd', 'h', 'v'];

function outcomeBadgeForSide(side, lastResult) {
  if (!lastResult) return 'neutral';
  const { outcome, profit } = lastResult;
  const p = Number(profit);
  if (outcome === 'push') return 'neutral';
  if (outcome === 'win') return side === 'player' ? 'crown' : 'x';
  if (outcome === 'loss') return side === 'dealer' ? 'crown' : 'x';
  if (outcome === 'split') {
    if (p > 0) return side === 'player' ? 'crown' : 'x';
    if (p < 0) return side === 'dealer' ? 'crown' : 'x';
    return 'neutral';
  }
  return 'neutral';
}

function HandOutcomeBadge({ side, lastResult }) {
  const kind = outcomeBadgeForSide(side, lastResult);
  if (kind === 'crown') {
    return (
      <span
        className="material-symbols-outlined trainer-outcome-icon trainer-outcome-icon--crown"
        aria-label={`${side === 'player' ? 'Player' : 'Dealer'} won`}
      >
        crown
      </span>
    );
  }
  if (kind === 'x') {
    return (
      <span
        className="material-symbols-outlined trainer-outcome-icon trainer-outcome-icon--lose"
        aria-label={`${side === 'player' ? 'Player' : 'Dealer'} lost`}
      >
        close
      </span>
    );
  }
  return <div className="trainer-panel-corner-placeholder" aria-hidden="true" />;
}

const Terminal = ({ autoSelect = true, handCount = 1, onGameComplete = () => {} }) => {
  const [connected, setConnected] = useState(false);
  const [playerHand, setPlayerHand] = useState({ cards: [], value: 0 });
  const [dealerHand, setDealerHand] = useState({ cards: [], value: 0 });
  const [actions, setActions] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(10);
  const [isBetBalanceModalOpen, setIsBetBalanceModalOpen] = useState(false);
  const [draftBalance, setDraftBalance] = useState('');
  const [draftBetAmount, setDraftBetAmount] = useState('');

  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8000/ws/game');

    ws.current.onopen = () => {
      setConnected(true);
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
            break;
          case 'actions':
            setActions(msg.actions || []);
            break;
          case 'hand':
            if (msg.owner === 'player')
              setPlayerHand({ cards: msg.cards || [], value: msg.value || 0, faceDown: false });
            else setDealerHand({ cards: msg.cards || [], value: msg.value || 0, faceDown: false });
            break;
          case 'card_shown':
            if (msg.card)
              setDealerHand({
                cards: [msg.card],
                value: msg.card && msg.card.value ? msg.card.value : 0,
                faceDown: msg.faceDown || false,
              });
            else setDealerHand({ cards: [], value: 0, faceDown: false });
            break;
          case 'state':
            if (msg.balance !== undefined) setBalance(msg.balance);
            if (msg.bet !== undefined) setBet(msg.bet);
            break;
          case 'result':
            setLastResult(msg);
            setTimeout(() => onGameComplete(), 4500);
            try {
              setTimeout(() => setLastResult(null), 4000);
            } catch (e) {}
            break;
          default:
            break;
        }
      } catch (e) {}
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
    setLastResult(null);
  };

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
    if (draftBetAmount !== '') setBet(Number(draftBetAmount));
    setIsBetBalanceModalOpen(false);
  };

  const orderedActions = ACTION_ORDER.map((code) => actions.find((a) => a.code === code)).filter(
    Boolean
  );

  const actionLabel = (code) => {
    if (code === 's') return 'Stand';
    if (code === 'd') return 'Double';
    if (code === 'h') return 'Hit';
    if (code === 'v') return 'Split';
    return code;
  };

  const actionClass = (code) => {
    if (code === 's') return 'trainer-action-btn trainer-action-btn--stand';
    if (code === 'd') return 'trainer-action-btn trainer-action-btn--double';
    if (code === 'h') return 'trainer-action-btn trainer-action-btn--hit';
    return 'trainer-action-btn trainer-action-btn--split';
  };

  return (
    <div className="trainer-terminal">
      <div className="header-wrap">
        <div className="header-title-wrap">
          <h1 className="simulation-header-title">Training</h1>
          <p className="simulation-header-subtitle">
            Interactive Mode{handCount != null ? ` · Hand ${handCount}` : ''}
          </p>
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
          <h1 className="h1-sub">${bet}</h1>
        </div>
        <div className="header-block-wrap">
          <p className="simulation-header-subtitle">Balance:</p>
          <h1 className="h1-sub">${balance}</h1>
        </div>
      </div>

      {!connected && (
        <p className="trainer-connection-hint" role="status">
          Connecting to game server…
        </p>
      )}

      <div className="section-wrap section-wrap--trainer-hands">
        <div className="section-block-wrap trainer-hand-panel">
          <div className="trainer-hand-cards-row dealer-cards">
            {dealerHand.cards.map((c, i) => (
              <Card key={i} rank={c.rank} suit={c.suit} />
            ))}
            {dealerHand.faceDown && (
              <img src="/cards/face-down.svg" alt="Face down" className="face-down-card" />
            )}
          </div>
          <div className="trainer-hand-footer">
            <div className="section-block-title-wrap trainer-hand-heading">
              <h1 className="h1-sub">Dealer</h1>
              <p>Value: {dealerHand.value}</p>
            </div>
            <HandOutcomeBadge side="dealer" lastResult={lastResult} />
          </div>
        </div>

        <div className="section-block-wrap trainer-hand-panel">
          <div className="trainer-hand-cards-row hand-cards">
            {playerHand.cards.map((c, i) => (
              <Card key={i} rank={c.rank} suit={c.suit} />
            ))}
          </div>
          <div className="trainer-hand-footer">
            <div className="section-block-title-wrap trainer-hand-heading">
              <h1 className="h1-sub">Player</h1>
              <p>Value: {playerHand.value}</p>
            </div>
            <HandOutcomeBadge side="player" lastResult={lastResult} />
          </div>
        </div>
      </div>

      <div className="section-wrap section-wrap--trainer-options">
        <div className="section-block-wrap trainer-options-bar">
          <div className="section-block-title-wrap">
            <h1 className="h1-sub">Your options</h1>
          </div>
          <div className="section-block-content-wrap trainer-options-actions">
            {orderedActions.length > 0 ? (
              orderedActions.map((a) => (
                <button
                  key={a.code}
                  type="button"
                  className={actionClass(a.code)}
                  onClick={() => sendAction(a.code)}
                >
                  {actionLabel(a.code)}
                </button>
              ))
            ) : (
              <button
                type="button"
                className="run-btn trainer-play-btn"
                onClick={handlePlay}
                disabled={!connected}
              >
                Play
              </button>
            )}
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
                placeholder={String(bet)}
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
