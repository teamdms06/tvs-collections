import { useState } from "react";
import "./App.css";
import AdminPage from "./pages/AdminPage";
import CommercialPage from "./pages/CommercialPage";
import ConsumerDurablePage from "./pages/ConsumerDurablePage";
import LoginPage from "./pages/LoginPage";
import RetailPage from "./pages/RetailPage";

const agentPages = {
  consumer: ConsumerDurablePage,
  retail: RetailPage,
  commercial: CommercialPage,
};

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch (error) {
      console.error("Failed to parse stored user:", error);
      localStorage.removeItem("user");
      localStorage.removeItem("authToken");
      return null;
    }
  });

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
  };

  // Map roles array to single role (use first role for now)
  const userRole =
    currentUser.roles && currentUser.roles.length > 0
      ? currentUser.roles[0]
      : "agent";

  if (userRole === "admin") {
    return <AdminPage onLogout={logout} user={currentUser} />;
  }

  const defaultProduct =
    currentUser.accessProducts && currentUser.accessProducts.length > 0
      ? currentUser.accessProducts[0]
      : "consumer";
  const AgentPage = agentPages[defaultProduct] || ConsumerDurablePage;

  return <AgentPage onLogout={logout} user={currentUser} />;
}

export default App;

