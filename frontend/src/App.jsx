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

  // Dashboard page
  const dashboardPage = (
    <div className="app-container dashboard-page">
      <h1 className="dashboard-title">Incoming Dashboard</h1>
      <p className="dashboard-intro">Dashboard features coming soon...</p>
    </div>
  )

  return (
    <Router>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/trainer" element={<Trainer />} />
          <Route path="/dashboard" element={dashboardPage} />
          <Route path="/" element={dashboardPage} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  )
}

export default App
