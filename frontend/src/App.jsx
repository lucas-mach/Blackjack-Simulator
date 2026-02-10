import { useState } from 'react'
import './App.css'

function App() {
  const [output, setOutput] = useState('')

  const handleRunSimulation = () => {
    // We will call the backend API here
    setOutput('Future functionality here...')
  }

  return (
    <>
      <h1>Welcome to the Blackjack Simulator</h1>
      <button onClick={handleRunSimulation}>run simulation</button>

      <section aria-label="Simulation output">
        <h2>Output</h2>
        <div className="output-container">
          {output || 'Click \'run simulation\' above to see results.'}
        </div>
      </section>
    </>
  )
}

export default App
