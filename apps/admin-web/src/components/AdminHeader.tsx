import './AdminHeader.css'

export default function AdminHeader() {
  return (
    <header className="admin-header">
      <h1 className="admin-title">Admin Portal</h1>
      <div className="admin-header-actions">
        <span className="admin-user">Administrator</span>
      </div>
    </header>
  )
}
