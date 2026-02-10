import { useState } from 'react'
import './App.css'

function App() {
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRunSimulation = async () => {
    setLoading(true)
    setOutput('Calling backend...')
    
    try {
      const response = await fetch('http://127.0.0.1:8000/health')
      const data = await response.json()
      setOutput(JSON.stringify(data, null, 2))
    } catch (error) {
      setOutput(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
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
