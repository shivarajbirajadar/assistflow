import { useState } from 'react';

import {
  Mail,
  LockKeyhole,
  UserRound,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context.jsx';
import { authAPI, getAPIError } from '../api.js';

import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Form.jsx';


/* =========================================================
   LOGIN PAGE
========================================================= */

export default function Login() {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [mode, setMode] = useState('login');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const isLogin = mode === 'login';

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) {
      setError('');
    }
  };


  /* =====================================================
     FORM SUBMISSION
  ===================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (!isLogin) {
      if (!form.name.trim()) {
        setError('Please enter your name.');
        return;
      }

      if (password.length < 8) {
        setError('Password must contain at least 8 characters.');
        return;
      }

      if (password !== form.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    try {
      setLoading(true);

      if (isLogin) {
        await login({ email, password });
      } else {
        await authAPI.register({
          name: form.name.trim(),
          email,
          password,
        });

        await login({ email, password });
      }

      navigate('/', { replace: true });

    } catch (err) {
      setError(
        getAPIError(err) ||
        'Unable to authenticate. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };


  /* =====================================================
     MODE SWITCH
  ===================================================== */

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');

    setForm({
      name: '',
      email: form.email,
      password: '',
      confirmPassword: '',
    });
  };


  return (
    <div className="login-page">

      {/* LEFT BRAND PANEL */}

      <section className="login-brand-panel">

        <div className="login-brand">

          <div className="login-brand-icon">
            <Mail size={22} />
          </div>

          <span>AssistFlow</span>

        </div>


        <div className="login-brand-content">

          <span className="login-eyebrow">
            PERSONAL ASSISTANT WORKSPACE
          </span>

          <h1>
            Manage emails.
            <br />
            Focus on what
            <br />
            <span>matters.</span>
          </h1>

          <p>
            A smarter email workspace that helps personal
            assistants organize conversations, coordinate
            replies and keep important work moving.
          </p>


          <div className="login-feature-list">

            <div className="login-feature">
              <span className="login-feature-icon">
                <Sparkles size={17} />
              </span>

              <div>
                <strong>AI-powered organization</strong>
                <span>
                  Understand and classify conversations.
                </span>
              </div>
            </div>


            <div className="login-feature">
              <span className="login-feature-icon">
                <UsersIcon />
              </span>

              <div>
                <strong>Team collaboration</strong>
                <span>
                  Keep track of ownership and activity.
                </span>
              </div>
            </div>


            <div className="login-feature">
              <span className="login-feature-icon">
                <ShieldCheck size={17} />
              </span>

              <div>
                <strong>Clear communication</strong>
                <span>
                  Keep important conversations visible.
                </span>
              </div>
            </div>

          </div>

        </div>


        <div className="login-brand-footer">
          © {new Date().getFullYear()} AssistFlow
        </div>

      </section>


      {/* RIGHT FORM PANEL */}

      <section className="login-form-panel">

        <div className="login-form-container">

          <div className="login-mobile-brand">
            <div className="login-brand-icon">
              <Mail size={20} />
            </div>

            <span>AssistFlow</span>
          </div>


          <div className="login-form-heading">

            <span className="login-form-eyebrow">
              {isLogin ? 'WELCOME BACK' : 'GET STARTED'}
            </span>

            <h2>
              {isLogin
                ? 'Sign in to your account'
                : 'Create your account'}
            </h2>

            <p>
              {isLogin
                ? 'Enter your details to access your workspace.'
                : 'Set up your personal assistant workspace.'}
            </p>

          </div>


          {/* MODE TABS */}

          <div className="login-mode-tabs">

            <button
              type="button"
              className={isLogin ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              Sign In
            </button>

            <button
              type="button"
              className={!isLogin ? 'active' : ''}
              onClick={() => switchMode('signup')}
            >
              Sign Up
            </button>

          </div>


          {/* ERROR */}

          {error && (
            <div
              className="login-error"
              role="alert"
            >
              <AlertCircle size={17} />

              <span>{error}</span>
            </div>
          )}


          {/* FORM */}

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

            {!isLogin && (
              <Input
                label="Full name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={(event) =>
                  updateField('name', event.target.value)
                }
                leftIcon={<UserRound size={17} />}
                autoComplete="name"
                required
              />
            )}


            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(event) =>
                updateField('email', event.target.value)
              }
              leftIcon={<Mail size={17} />}
              autoComplete="email"
              required
            />


            <div className="login-password-field">

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={(event) =>
                  updateField('password', event.target.value)
                }
                leftIcon={<LockKeyhole size={17} />}
                autoComplete={
                  isLogin
                    ? 'current-password'
                    : 'new-password'
                }
                required
              />

              <button
                type="button"
                className="login-password-toggle"
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                onClick={() =>
                  setShowPassword((current) => !current)
                }
              >
                {showPassword
                  ? <EyeOff size={17} />
                  : <Eye size={17} />}
              </button>

            </div>


            {!isLogin && (
              <>
                <div className="login-password-field">

                  <Input
                    label="Confirm password"
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    placeholder="Confirm your password"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      updateField(
                        'confirmPassword',
                        event.target.value
                      )
                    }
                    leftIcon={<LockKeyhole size={17} />}
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="login-password-toggle"
                    aria-label={
                      showConfirmPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) => !current
                      )
                    }
                  >
                    {showConfirmPassword
                      ? <EyeOff size={17} />
                      : <Eye size={17} />}
                  </button>

                </div>

                <p className="login-password-hint">
                  Use at least 8 characters for your password.
                </p>
              </>
            )}


            {isLogin && (
              <div className="login-form-options">
                <span>
                  Secure account access
                </span>
              </div>
            )}


            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="login-submit-button"
              loading={loading}
              rightIcon={
                !loading && <ArrowRight size={17} />
              }
            >
              {isLogin
                ? 'Sign in'
                : 'Create account'}
            </Button>

          </form>


          {/* PROVIDER NOTE */}

          <div className="login-provider-note">

            <div className="login-provider-divider">
              <span />
              <p>EMAIL INTEGRATION</p>
              <span />
            </div>

            <div className="login-provider-info">
              <Mail size={16} />

              <span>
                Gmail and Outlook accounts supported
              </span>
            </div>

          </div>


          <p className="login-switch-text">
            {isLogin
              ? "Don't have an account?"
              : 'Already have an account?'}

            <button
              type="button"
              onClick={() =>
                switchMode(isLogin ? 'signup' : 'login')
              }
            >
              {isLogin ? 'Create account' : 'Sign in'}
            </button>
          </p>

        </div>

      </section>

    </div>
  );
}


/* =========================================================
   SMALL ICON COMPONENT
========================================================= */

function UsersIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}