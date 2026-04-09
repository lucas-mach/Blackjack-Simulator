import React, { useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import html2canvas from 'html2canvas';

const ResultsChart = ({ data, title, dataKey = 'value', xKey = 'handNumber', yLabel, xLabel }) => {
  const chartRef = useRef(null);

  if (!data || data.length === 0) {
    return (
      <div style={{
        color: '#555',
        padding: '40px 20px',
        textAlign: 'center',
        border: '1px dashed #333',
        borderRadius: '8px',
        fontSize: '0.9rem',
      }}>
        No data available for {title}
      </div>
    );
  }

  const handleDownload = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: '#111',
      scale: 2,
      useCORS: true,
    });
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Compute min/max for nice domain padding
  const values = data.map(d => d[dataKey]).filter(v => v != null);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = Math.max((maxVal - minVal) * 0.1, 1);

  // Determine the starting value for reference line
  const startVal = values.length > 0 ? values[0] : null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const val = payload[0].value;
    const isPositive = startVal != null ? val >= startVal : true;
    return (
      <div style={{
        background: '#1a1a1a',
        border: `1px solid ${isPositive ? '#00ff9d' : '#ff4d4d'}`,
        borderRadius: '6px',
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}>
        <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>
          {xLabel || 'Hand'} {label}
        </div>
        <div style={{
          color: isPositive ? '#00ff9d' : '#ff4d4d',
          fontWeight: 'bold',
          fontSize: '1rem',
        }}>
          {yLabel?.includes('$') ? `$${val.toLocaleString()}` : val.toLocaleString()}
        </div>
      </div>
    );
  };

  // Determine tick interval based on data length
  const tickInterval = data.length > 50 ? Math.ceil(data.length / 10) : undefined;

  return (
    <div style={{
      background: '#111',
      border: '1px solid #2a2a2a',
      borderRadius: '10px',
      padding: '20px',
      marginBottom: '16px',
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        color: '#ccc',
        fontSize: '0.95rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
      }}>
        {title}
      </h3>

      <div ref={chartRef} style={{ background: '#111', padding: '0 0 8px 0', borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 36 }}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00ff9d" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#1f1f1f" strokeDasharray="none" vertical={false} />

            {startVal != null && (
              <ReferenceLine
                y={startVal}
                stroke="#444"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}

            <XAxis
              dataKey={xKey}
              stroke="#444"
              tick={{ fill: '#666', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#2a2a2a' }}
              interval={tickInterval}
              label={{
                value: xLabel || 'Hand Number',
                position: 'bottom',
                offset: -6,
                fill: '#555',
                fontSize: 12,
                fontWeight: 500,
              }}
            />

            <YAxis
              stroke="#444"
              tick={{ fill: '#666', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={[Math.floor(minVal - padding), Math.ceil(maxVal + padding)]}
              label={{
                value: yLabel || 'Value',
                angle: -90,
                position: 'insideLeft',
                offset: 4,
                fill: '#555',
                fontSize: 12,
                fontWeight: 500,
              }}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333', strokeWidth: 1 }} />

            <Area
              type="stepAfter"
              dataKey={dataKey}
              stroke="#ffffff"
              strokeWidth={2}
              fill={`url(#gradient-${dataKey})`}
              dot={false}
              activeDot={{
                r: 5,
                fill: '#00ff9d',
                stroke: '#111',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <button
          onClick={handleDownload}
          style={{
            background: 'transparent',
            color: '#666',
            border: '1px solid #333',
            padding: '5px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.78rem',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.target.style.color = '#00ff9d'; e.target.style.borderColor = '#00ff9d'; }}
          onMouseLeave={e => { e.target.style.color = '#666'; e.target.style.borderColor = '#333'; }}
        >
          Download Chart
        </button>
      </div>
    </div>
  );
};

export default ResultsChart;