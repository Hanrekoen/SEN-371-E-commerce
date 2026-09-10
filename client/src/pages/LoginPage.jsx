import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/layout/Logo";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import Alert from "../components/ui/Alert";
import { EyeIcon, EyeOffIcon } from "../components/ui/Icons";
import { useAuth } from "../context/AuthContext";
import { fieldErrors, summaryMessage } from "../utils/apiErrors";
import "./LoginPage.css";

const EMPTY = { firstName: "", lastName: "", email: "", password: "" };

export default function LoginPage() {
  const [mode, setMode] = useState("signin");
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Sent here by a guard? Go back where they were trying to reach.
  const next = location.state?.from || "/";
  const isRegister = mode === "register";

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function switchMode(nextMode) {
    setMode(nextMode);
    setErrors({});
    setSummary(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setSummary(null);
    setErrors({});
    try {
      if (isRegister) {
        await register({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password,
        });
      } else {
        await login({ email: values.email, password: values.password });
      }
      navigate(next, { replace: true });
    } catch (err) {
      const perField = fieldErrors(err);
      setErrors(perField);
      // A 401 has no field details - the API deliberately does not say which
      // half of the pair was wrong, so neither does the form.
      if (Object.keys(perField).length === 0) {
        setSummary(summaryMessage(err, "We could not sign you in."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gv-auth">
      <aside className="gv-auth__hero" aria-hidden="true">
        <div className="gv-auth__hero-top"><Logo size="lg" /></div>
        <div className="gv-auth__hero-copy">
          <h2 className="gv-auth__hero-title">Access the Next Tier of Computing.</h2>
          <p className="gv-auth__hero-sub">
            Unlock limited member drops, high-end hardware teardowns, and
            absolute audio-optical performance.
          </p>
        </div>
      </aside>

      <section className="gv-auth__panel">
        <div className="gv-auth__form-wrap">
          <h1 className="gv-auth__title">{isRegister ? "Create Your Vault" : "Welcome Back"}</h1>
          <p className="gv-auth__sub">
            {isRegister
              ? "Register for member drops and order tracking"
              : "Enter your secure vault credentials or sign up"}
          </p>

          <div className="gv-auth__tabs" role="tablist" aria-label="Sign in or register">
            <button
              type="button" role="tab" id="tab-signin"
              aria-selected={!isRegister} aria-controls="auth-form"
              className={`gv-auth__tab ${!isRegister ? "is-active" : ""}`}
              onClick={() => switchMode("signin")}
            >
              Sign In
            </button>
            <button
              type="button" role="tab" id="tab-register"
              aria-selected={isRegister} aria-controls="auth-form"
              className={`gv-auth__tab ${isRegister ? "is-active" : ""}`}
              onClick={() => switchMode("register")}
            >
              Register
            </button>
          </div>

          {summary && <div className="gv-auth__alert"><Alert tone="danger">{summary}</Alert></div>}

          <form
            id="auth-form" className="gv-auth__form" onSubmit={onSubmit} noValidate
            role="tabpanel" aria-labelledby={isRegister ? "tab-register" : "tab-signin"}
          >
            {isRegister && (
              <div className="gv-auth__row">
                <Field
                  label="First name" autoComplete="given-name" value={values.firstName}
                  onChange={set("firstName")} error={errors.firstName} placeholder="Marcus"
                />
                <Field
                  label="Last name" autoComplete="family-name" value={values.lastName}
                  onChange={set("lastName")} error={errors.lastName} placeholder="Aurelius"
                />
              </div>
            )}

            <Field
              label="Email address" type="email" autoComplete="email" value={values.email}
              onChange={set("email")} error={errors.email} placeholder="operator@somatronics.com"
            />

            <div className="gv-auth__password">
              <Field
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={values.password}
                onChange={set("password")}
                error={errors.password}
                hint={isRegister ? "At least 8 characters, including a number." : undefined}
                placeholder="••••••••••••"
                action={
                  !isRegister ? (
                    <Link className="gv-auth__forgot" to="/support/contact">Forgot password?</Link>
                  ) : null
                }
              />
              <button
                type="button"
                className="gv-auth__reveal"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {!isRegister && (
              <label className="gv-auth__remember">
                {/* Session length is set by the refresh token's server-side TTL,
                    so this cannot be honoured from the client. Shown disabled
                    rather than as a control that silently does nothing. */}
                <input type="checkbox" disabled title="Session length is fixed at 7 days by the server" />
                <span>Remember this device for 30 days</span>
              </label>
            )}

            <Button type="submit" size="lg" full loading={busy}>
              {isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
