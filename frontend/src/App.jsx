import { useState } from 'react'
import './App.css'
import Navbar from './Navbar'
import Terminal from './Terminal'
import Simulation from './Simulation'
import Trainer from './Trainer'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

function App() {
  const [output, setOutput] = useState('')
  const [terminalKey, setTerminalKey] = useState(0)

  const handleRunSimulation = () => {
    setTerminalKey(prev => prev + 1)
    setOutput('Simulation session ' + (terminalKey + 1) + ' started...')
  }

  // keep original UI in a variable so we can route to it
  const interactivePage = (
    <div className="app-container">
      <h1>Blackjack Simulator</h1>
      <div className="controls">
        <button className="run-btn" onClick={handleRunSimulation}>
          Run Interactive Simulation (WebSocket)
        </button>
      </div>

      <section className="simulation-area">
        <div className="info-box">
          {output || 'Click "Run Simulation" to start the terminal session.'}
        </div>

        <div className="results-link">
          <a
            href="http://localhost:8010/results"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Results (results.txt)
          </a>
        </div>

        <div className="terminal-wrapper">
          {terminalKey > 0 ? (
            <Terminal key={terminalKey} />
          ) : (
            <div className="terminal-placeholder">
              Terminal will appear here once simulation starts.
            </div>
          )}
        </div>
      </section>
    </div>
  )

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/simulation" element={<Simulation />} />
        <Route path="/trainer" element={<Trainer />} />
        {/* keep original simulator UI available at root for now */}
        <Route path="/" element={interactivePage} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
