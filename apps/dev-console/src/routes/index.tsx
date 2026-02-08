import { createFileRoute } from '@tanstack/react-router'
import '../App.css'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Developer Console</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">API Requests</div>
          <div className="stat-value">12,345</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Errors (24h)</div>
          <div className="stat-value">23</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Avg Response Time</div>
          <div className="stat-value">142ms</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Services</div>
          <div className="stat-value">8/8</div>
        </div>
      </div>

      <p className="dashboard-note">
        Developer console foundation is ready. Add monitoring, debugging tools, and API documentation as needed.
      </p>
    </div>
  )
}
