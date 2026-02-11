import { useState } from 'react'
import './App.css'
import Terminal from './Terminal'

function App() {
  const [output, setOutput] = useState('')
  const [terminalKey, setTerminalKey] = useState(0)

  const handleRunSimulation = () => {
    setTerminalKey(prev => prev + 1)
    setOutput('Simulation session ' + (terminalKey + 1) + ' started...')
  }

  return (
    <div className="app-container">
      <h1>Blackjack Simulator</h1>
      <div className="controls">
        <button className="run-btn" onClick={handleRunSimulation}>
          Run Simulation
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
}

export default App
