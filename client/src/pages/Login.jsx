import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="auth-brand-top">
          <span className="brand-mark">W</span>
          <span className="brand-name">Web Smile India</span>
        </div>
        <div>
          <p className="auth-brand-tagline">Every lead, every deal, one clear pipeline.</p>
          <p className="auth-brand-sub">
            Track contacts, follow up on leads, and move deals through your pipeline
            without losing track of a single conversation.
          </p>
        </div>
        <p className="auth-brand-foot">Web Smile India CRM</p>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="auth-sub">Sign in to open your pipeline.</p>
          {error && <div className="alert">{error}</div>}
          <form onSubmit={handleSubmit}>
            <label>Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
        </div>
      </div>
    </div>
  );
}