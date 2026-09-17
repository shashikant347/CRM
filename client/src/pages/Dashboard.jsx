import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { Users, Target, Briefcase, TrendingUp, Trophy } from 'lucide-react';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function Dashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setSummary(res.data));
  }, []);

  return (
    <Layout>
      <header className="page-header">
        <h1>Overview</h1>
        <p>Where the pipeline stands right now.</p>
      </header>

      {!summary ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon"><Users size={16} /></div>
              <span className="stat-label">Contacts</span>
              <span className="stat-value">{summary.contactCount}</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><Target size={16} /></div>
              <span className="stat-label">Leads</span>
              <span className="stat-value">{summary.leadCount}</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><Briefcase size={16} /></div>
              <span className="stat-label">Open deals</span>
              <span className="stat-value">{summary.openDealCount}</span>
            </div>
            <div className="stat-card accent">
              <div className="stat-icon"><TrendingUp size={16} /></div>
              <span className="stat-label">Pipeline value</span>
              <span className="stat-value">{currency(summary.pipelineValue)}</span>
            </div>
            <div className="stat-card won">
              <div className="stat-icon"><Trophy size={16} /></div>
              <span className="stat-label">Won value</span>
              <span className="stat-value">{currency(summary.wonValue)}</span>
            </div>
          </div>

          <section className="panel">
            <h2>Deals by stage</h2>
            <div className="stage-bars">
              {summary.dealsByStage.map((row) => (
                <div className="stage-bar-row" key={row.stage}>
                  <span className="stage-bar-label" style={{ textTransform: 'capitalize' }}>{row.stage}</span>
                  <div className="stage-bar-track">
                    <div
                      className="stage-bar-fill"
                      style={{ width: `${Math.min(100, (row.count / Math.max(1, summary.leadCount + summary.openDealCount)) * 100 + 8)}%` }}
                    />
                  </div>
                  <span className="stage-bar-count">{row.count}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </Layout>
  );
}