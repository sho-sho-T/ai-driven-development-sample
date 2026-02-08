import { createFileRoute } from '@tanstack/react-router'
import '../App.css'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">1,234</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Sessions</div>
          <div className="stat-value">56</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">789</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Revenue</div>
          <div className="stat-value">$12,345</div>
        </div>
      </div>

      <p className="dashboard-note">
        Admin portal foundation is ready. Add authentication and additional features as needed.
      </p>
    </div>
  )
}
