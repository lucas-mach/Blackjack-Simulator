import React, { useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';

const ResultsChart = ({ data, title, dataKey = 'value', xKey = 'hand' }) => {
  const chartRef = useRef(null);

  if (!data || data.length === 0) return <p>No data available for {title}</p>;

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
    <div style={{ margin: '20px 0', border: '1px solid #444', padding: '15px', borderRadius: '8px' }}>
      <h3 style={{ marginBottom: '10px' }}>{title}</h3>
      <div ref={chartRef} style={{ background: '#1a1a1a', padding: '10px', borderRadius: '6px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey={xKey} stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #555' }} />
            <Legend />
            <Line type="monotone" dataKey={dataKey} stroke="#00ff9d" activeDot={{ r: 8 }} />
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
    </div>
  );
};

export default ResultsChart;