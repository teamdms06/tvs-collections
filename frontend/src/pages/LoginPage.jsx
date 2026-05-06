import { useState } from "react";
import { demoUsers } from "../data/users";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("retail@tvs.com");
  const [password, setPassword] = useState("agent123");
  const [error, setError] = useState("");

  const submitLogin = (event) => {
    event.preventDefault();

    const user = demoUsers.find(
      (item) =>
        item.email.toLowerCase() === email.trim().toLowerCase() &&
        item.password === password,
    );

    if (!user) {
      setError("Invalid email or password.");
      return;
    }

    setError("");
    onLogin(user);
  };

  return (
    <main className="login-shell">
      <section className="login-hero" aria-label="Collections login">
        <div className="login-visual" aria-hidden="true">
          <div className="visual-orbit visual-orbit--one"></div>
          <div className="visual-orbit visual-orbit--two"></div>

          {/* Animated Collections Process Flow */}
          <div className="collections-process">
            <div className="process-stage">
              <div className="stage-icon">📞</div>
              <div className="stage-label">Contact</div>
              <div className="stage-subtitle">Reach out</div>
            </div>
            <div className="process-arrow"></div>

            <div className="process-stage">
              <div className="stage-icon">🤝</div>
              <div className="stage-label">Promise</div>
              <div className="stage-subtitle">Commitment</div>
            </div>
            <div className="process-arrow"></div>

            <div className="process-stage">
              <div className="stage-icon">💳</div>
              <div className="stage-label">Payment</div>
              <div className="stage-subtitle">Collect</div>
            </div>
            <div className="process-arrow"></div>

            <div className="process-stage">
              <div className="stage-icon">✓</div>
              <div className="stage-label">Resolution</div>
              <div className="stage-subtitle">Closure</div>
            </div>
          </div>

          <svg className="login-illustration" viewBox="0 0 420 340" role="img">
            <path
              d="M72 238c38-84 77-127 137-126 72 1 107 57 139 142"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="18"
            />
            <rect
              x="94"
              y="64"
              width="238"
              height="164"
              rx="18"
              fill="currentColor"
              opacity="0.12"
            />
            <rect
              x="124"
              y="98"
              width="178"
              height="20"
              rx="10"
              fill="currentColor"
              opacity="0.72"
            />
            <rect
              x="124"
              y="136"
              width="126"
              height="16"
              rx="8"
              fill="currentColor"
              opacity="0.35"
            />
            <rect
              x="124"
              y="166"
              width="154"
              height="16"
              rx="8"
              fill="currentColor"
              opacity="0.35"
            />
            <circle
              cx="306"
              cy="246"
              r="44"
              fill="currentColor"
              opacity="0.18"
            />
            <path
              d="M288 247l14 14 28-34"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="12"
            />
          </svg>
          <div className="visual-copy">
            <span>Efficient Collections</span>
            <strong>Streamlined workflow for better outcomes.</strong>
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
              <span>Email</span>
              <input
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
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
            <button className="primary-action" type="submit">
              Login
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
