import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create account');
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
          <p className="auth-brand-tagline">Set up your workspace in under a minute.</p>
          <p className="auth-brand-sub">
            Add your first contact, create a lead, and watch it move across your pipeline —
            no setup, no spreadsheets.
          </p>
        </div>
        <p className="auth-brand-foot">Web Smile India CRM</p>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <h1>Create your workspace</h1>
          <p className="auth-sub">Start tracking leads and deals in minutes.</p>
          {error && <div className="alert">{error}</div>}
          <form onSubmit={handleSubmit}>
            <label>Full name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>Password
              <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}