import { useState } from "react";
import { API_BASE_URL } from "../api/config";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Invalid username or password.");
      }

      const data = await response.json();
      localStorage.setItem("authToken", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data));
      onLogin(data);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-hero" aria-label="Collections login">
        <div className="login-visual" aria-hidden="true">
          <div className="visual-orbit visual-orbit--one"></div>
          <div className="visual-orbit visual-orbit--two"></div>

          <svg
            className="login-illustration collections-illustration"
            viewBox="0 0 620 430"
            role="img"
            aria-label="Collections analytics illustration"
          >
            <defs>
              <linearGradient id="moneyBag" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#16BAC2" />
                <stop offset="100%" stopColor="#004E98" />
              </linearGradient>
              <linearGradient id="coinFill" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#F29200" />
                <stop offset="100%" stopColor="#F26321" />
              </linearGradient>
            </defs>

            <path
              className="blob-shape"
              d="M76 236c-20-80 38-158 122-155 48 2 72-44 121-49 66-8 112 36 125 89 15 58 91 61 111 115 25 66-23 134-92 140H151c-39-3-65-45-75-140z"
            />

            <g className="chart-board">
              <rect x="260" y="78" width="238" height="252" rx="16" />
              <rect x="296" y="111" width="84" height="12" rx="6" />
              <rect x="296" y="136" width="148" height="8" rx="4" />
              <rect x="296" y="157" width="116" height="8" rx="4" />
              <path className="growth-line" d="M300 262l48-58 52 34 72-94" />
              <circle cx="300" cy="262" r="7" />
              <circle cx="348" cy="204" r="7" />
              <circle cx="400" cy="238" r="7" />
              <circle cx="472" cy="144" r="7" />
              <rect x="316" y="278" width="32" height="52" rx="3" />
              <rect x="364" y="252" width="32" height="78" rx="3" />
              <rect x="412" y="218" width="32" height="112" rx="3" />
              <rect x="460" y="179" width="32" height="151" rx="3" />
            </g>

            <g className="money-bag">
              <path d="M143 145c34-20 70-20 104 0l-19 39h-66z" />
              <path d="M134 184h122c33 55 49 108 28 141-16 25-55 39-88 39s-72-14-88-39c-21-33-5-86 26-141z" />
              <path d="M153 185h85" />
              <text x="195" y="286" textAnchor="middle">$</text>
            </g>

            <g className="agent-person">
              <circle cx="142" cy="196" r="22" />
              <path d="M111 250c8-32 26-48 55-48 26 0 45 16 55 48l-28 18h-55z" />
              <path d="M139 263h91l-12 52h-97z" />
              <path d="M116 318h110" />
            </g>

            <g className="coin coin-one">
              <circle cx="520" cy="104" r="34" />
              <text x="520" y="116" textAnchor="middle">$</text>
            </g>
            <g className="coin coin-two">
              <circle cx="544" cy="302" r="28" />
              <text x="544" y="312" textAnchor="middle">$</text>
            </g>
            <g className="check-badge">
              <circle cx="242" cy="86" r="32" />
              <path d="M226 86l11 12 24-29" />
            </g>
            <g className="floating-card">
              <rect x="76" y="80" width="82" height="54" rx="10" />
              <path d="M92 99h48M92 115h30" />
            </g>
          </svg>

          <div className="visual-copy">
            <span>Collections Intelligence</span>
            <strong>Track accounts, record attempts, and close collections with clarity.</strong>
          </div>
        </div>

        <div className="login-panel">
          <div>
            <p className="eyebrow">TVS Collections</p>
            <h1>Sign in</h1>
            <p className="login-copy">
              Access your assigned collection workspace.
            </p>
          </div>

          <form className="login-form" onSubmit={submitLogin}>
            <label>
              <span>Username</span>
              <input
                onChange={(event) => setUsername(event.target.value)}
                type="text"
                value={username}
              />
            </label>
            <label>
              <span>Password</span>
              <input
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            {error && <p className="login-error">{error}</p>}
            <button className="primary-action" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="demo-users">
            <strong>Demo users</strong>
            <span>admin@tvs.com / admin123</span>
            <span>consumer@tvs.com / agent123</span>
            <span>retail@tvs.com / agent123</span>
            <span>commercial@tvs.com / agent123</span>
          </div>
        </div>
      </section>
    </main>
  );
}
