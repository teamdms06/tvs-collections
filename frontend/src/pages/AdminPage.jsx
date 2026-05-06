import { useState } from 'react'

const adminMenu = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'report', label: 'Report' },
  { key: 'upload', label: 'Upload Data' },
  { key: 'export', label: 'Export Data' },
  { key: 'users', label: 'User Manager' },
]

const statCards = [
  { label: 'Uploaded files', value: '24' },
  { label: 'Total leads', value: '18,420' },
  { label: 'Feedback today', value: '1,284' },
  { label: 'Active agents', value: '36' },
]

function AdminContent({ activeMenu }) {
  if (activeMenu === 'dashboard') {
    return (
      <section className="admin-grid">
        {statCards.map((card) => (
          <article className="admin-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>
    )
  }

  if (activeMenu === 'upload') {
    return (
      <section className="admin-card admin-card--wide">
        <h2>Upload Data</h2>
        <label className="upload-box">
          <span>Upload lead data</span>
          <input accept=".csv,.xlsx,.xls" type="file" />
          <strong>Consumer, Retail, or Commercial upload file</strong>
        </label>
      </section>
    )
  }

  if (activeMenu === 'export') {
    return (
      <section className="admin-card admin-card--wide">
        <h2>Export Data</h2>
        <div className="admin-actions">
          <button className="primary-action" type="button">
            Export Latest Feedback
          </button>
          <button className="secondary-action" type="button">
            Export All Attempts
          </button>
        </div>
      </section>
    )
  }

  if (activeMenu === 'users') {
    return (
      <section className="admin-card admin-card--wide">
        <h2>User Manager</h2>
        <div className="admin-table">
          <span>Name</span>
          <span>Role</span>
          <span>Access</span>
          <strong>Admin User</strong>
          <span>admin</span>
          <span>All forms</span>
          <strong>Retail Agent</strong>
          <span>agent</span>
          <span>Retail</span>
          <strong>Commercial Agent</strong>
          <span>agent</span>
          <span>Commercial</span>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-card admin-card--wide">
      <h2>Report</h2>
      <p>Report filters and collection summaries will load here.</p>
    </section>
  )
}

export default function AdminPage({ onLogout, user }) {
  const [activeMenu, setActiveMenu] = useState('dashboard')

  return (
    <main className="workspace-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Admin workspace</p>
          <h1>{user.name}</h1>
        </div>
        <button className="secondary-action" onClick={onLogout} type="button">
          Logout
        </button>
      </header>

      <section className="admin-shell">
        <aside className="admin-menu" aria-label="Admin menu">
          {adminMenu.map((item) => (
            <button
              className={
                item.key === activeMenu ? 'admin-menu-item admin-menu-item--active' : 'admin-menu-item'
              }
              key={item.key}
              onClick={() => setActiveMenu(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </aside>
        <div className="admin-content">
          <AdminContent activeMenu={activeMenu} />
        </div>
      </section>
    </main>
  )
}
