import { useState } from 'react'
import './App.css'
import AdminPage from './pages/AdminPage'
import CommercialPage from './pages/CommercialPage'
import ConsumerDurablePage from './pages/ConsumerDurablePage'
import LoginPage from './pages/LoginPage'
import RetailPage from './pages/RetailPage'

const agentPages = {
  consumer: ConsumerDurablePage,
  retail: RetailPage,
  commercial: CommercialPage,
}

function App() {
  const [currentUser, setCurrentUser] = useState(null)

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />
  }

  const logout = () => setCurrentUser(null)

  if (currentUser.role === 'admin') {
    return <AdminPage onLogout={logout} user={currentUser} />
  }

  const defaultProduct = currentUser.productAccess[0]
  const AgentPage = agentPages[defaultProduct] || ConsumerDurablePage

  return <AgentPage onLogout={logout} user={currentUser} />
}

export default App
