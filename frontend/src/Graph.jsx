import React, { useEffect, useState } from 'react';

// Simple SVG line chart for testing (no external deps)
const Graph = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  // Tooltip state must be declared before any early return or hook
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8010/results')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch results');
        return res.text();
      })
      .then((csv) => {
        const lines = csv.trim().split('\n');
        const header = lines[0].split(',');
        const rows = lines.slice(1).map(line => {
          const values = line.split(',');
          // Map CSV columns to object
          const obj = {};
          header.forEach((h, i) => {
            obj[h] = isNaN(Number(values[i])) ? values[i] : Number(values[i]);
          });
          return obj;
        });
        setData(rows);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div style={{color:'red'}}>Error: {error}</div>;
  if (!data.length) return <div>Loading...</div>;

  // SVG chart dimensions
  const width = 600, height = 300, padding = 40;
  const hands = data.map(d => d.hand);
  const balances = data.map(d => d.balance);
  const minX = Math.min(...hands), maxX = Math.max(...hands);
  const minY = Math.min(...balances), maxY = Math.max(...balances);
  // Scale functions
  // Avoid division by zero for flat data
  const x = hand => {
    if (maxX === minX) return width / 2;
    return padding + ((hand - minX) / (maxX - minX)) * (width - 2 * padding);
  };
  const y = balance => {
    if (maxY === minY) return height / 2;
    return height - padding - ((balance - minY) / (maxY - minY)) * (height - 2 * padding);
  };
  // Line path
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.hand)},${y(d.balance)}`).join(' ');

  return (
    <div style={{padding:20, position:'relative'}}>
      <h2>Balance vs Hand Number</h2>
      <svg width={width} height={height} style={{background:'#222', borderRadius:8}}>
        {/* Axes */}
        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#aaa" />
        <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="#aaa" />
        {/* Y axis labels */}
        <text x={padding-10} y={y(minY)} fill="#aaa" textAnchor="end">{minY}</text>
        <text x={padding-10} y={y(maxY)} fill="#aaa" textAnchor="end">{maxY}</text>
        {/* X axis labels */}
        <text x={x(minX)} y={height-padding+20} fill="#aaa" textAnchor="middle">{minX}</text>
        <text x={x(maxX)} y={height-padding+20} fill="#aaa" textAnchor="middle">{maxX}</text>
        {/* Line */}
        <path d={path} fill="none" stroke="#00ff00" strokeWidth={2} />
        {/* Points for interaction */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={x(d.hand)}
            cy={y(d.balance)}
            r={6}
            fill={hovered === i ? '#ff0' : '#00ff00'}
            opacity={0.7}
            style={{cursor:'pointer'}}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      {/* Tooltip */}
      {hovered !== null && (
        <div
          style={{
            position: 'absolute',
            left: x(data[hovered].hand) + 20,
            top: y(data[hovered].balance) + 40,
            background: '#222',
            color: '#fff',
            border: '1px solid #00ff00',
            borderRadius: 8,
            padding: '10px 16px',
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: 120,
            boxShadow: '0 2px 8px #000a',
            fontSize: 15
          }}
        >
          <div><b>Hand:</b> {data[hovered].hand}</div>
          <div><b>Balance:</b> {data[hovered].balance}</div>
          <div><b>Card Count:</b> {data[hovered].card_count}</div>
          <div><b>True Count:</b> {data[hovered].true_count}</div>
          <div><b>Bet:</b> {data[hovered].bet}</div>
        </div>
      )}
    </div>
  );
};

export default Graph;
