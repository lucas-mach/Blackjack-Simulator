import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// Make sure recharts is installed: npm install recharts

const ResultsChart = ({ data, title, dataKey = 'value', xKey = 'hand' }) => {
  if (!data || data.length === 0) return <p>No data available for {title}</p>;

  return (
    <div style={{ margin: '20px 0', border: '1px solid #444', padding: '15px', borderRadius: '8px' }}>
      <h3 style={{ marginBottom: '10px' }}>{title}</h3>
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
  );
};

export default ResultsChart;