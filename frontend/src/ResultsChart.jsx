import React, { useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// Make sure recharts is installed: npm install recharts
import html2canvas from 'html2canvas';

const ResultsChart = ({ data, title, dataKey = 'value', xKey = 'handNumber', yLabel, xLabel }) => {
  const chartRef = useRef(null);

  if (!data || data.length === 0) {
    return <div>No data available for {title}</div>;
  }

  const handleDownload = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: '#1a1a1a',
      scale: 2,
      useCORS: true,
    });
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <>
      <h3 style={{ marginBottom: '10px', color: '#00ff9d' }}>{title}</h3>

      <div ref={chartRef} style={{ background: '#1a1a1a', padding: '10px', borderRadius: '6px' }}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />

          {/* X-axis with label */}
          <XAxis
            dataKey={xKey}
            stroke="#ccc"
            label={{
              value: xLabel || 'Hand Number',
              position: 'bottom',
              offset: -10,
              fill: '#ccc',
              fontSize: 14
            }}
          />

          {/* Y-axis with label */}
          <YAxis
            stroke="#ccc"
            label={{
              value: yLabel || 'Value',
              angle: -90,
              position: 'left',
              offset: -10,
              fill: '#ccc',
              fontSize: 14
            }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#222',
              border: '1px solid #00ff9d',
              padding: '10px 14px'
            }}
            labelStyle={{
              fontWeight: 'bold',
              color: '#00ff9d',
              marginBottom: '8px'   //<----- NEW Fix: pushes label to very top of tooltip
            }}
          />

          <Legend />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="#00ff9d"
            strokeWidth={3}
            activeDot={{ r: 8, fill: '#00ff9d' }}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>

      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        <button
          onClick={handleDownload}
          style={{
            background: '#00ff9d',
            color: '#000',
            border: 'none',
            padding: '6px 18px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85em',
          }}
        >
          Download Chart
        </button>
      </div>
    </>
  );
};

export default ResultsChart;