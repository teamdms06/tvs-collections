import { useCallback, useEffect, useState } from "react";
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

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_STORAGE_KEY = "lastActivityAt";

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

  const logout = useCallback(() => {
    const token = localStorage.getItem("authToken");

    if (token) {
      fetch("http://localhost:4000/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch((error) => {
        console.error("Logout tracking failed:", error);
      });
    }

    setCurrentUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
    setCurrentUser(userData);
  };

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    let timeoutId;
    const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart"];

    const scheduleLogout = () => {
      window.clearTimeout(timeoutId);
      const lastActivityAt = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY) || Date.now());
      const elapsed = Date.now() - lastActivityAt;
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_MS - elapsed);

      timeoutId = window.setTimeout(() => {
        logout();
      }, remaining);
    };

    const markActivity = () => {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
      scheduleLogout();
    };

    if (!localStorage.getItem(ACTIVITY_STORAGE_KEY)) {
      markActivity();
    } else {
      scheduleLogout();
    }

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
    };
  }, [currentUser, logout]);

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

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

