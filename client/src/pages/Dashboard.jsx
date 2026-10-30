import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import { ArrowRight, Briefcase, KanbanSquare, Target, TrendingUp, Trophy, Users } from 'lucide-react';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function Dashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setSummary(res.data));
  }, []);

  const maxStageCount = summary
    ? Math.max(1, ...summary.dealsByStage.map((stage) => Number(stage.count)))
    : 1;

  return (
    <Layout>
      <header className="page-header dashboard-header">
        <div>
          <span className="page-eyebrow">WORKSPACE OVERVIEW</span>
          <h1>A clear view of your pipeline</h1>
          <p>Keep an eye on your relationships and revenue in one place.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn-secondary" to="/contacts">
            <Users size={15} />
            Contacts
          </Link>
          <Link className="btn-primary" to="/deals">
            <KanbanSquare size={15} />
            View pipeline
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {!summary ? (
        <div className="dashboard-loading" role="status">Loading your workspace…</div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">Contacts</span>
                <div className="stat-icon contacts"><Users size={17} /></div>
              </div>
              <span className="stat-value">{summary.contactCount}</span>
              <span className="stat-detail">People in your workspace</span>
            </div>
            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">Leads</span>
                <div className="stat-icon leads"><Target size={17} /></div>
              </div>
              <span className="stat-value">{summary.leadCount}</span>
              <span className="stat-detail">Potential customers</span>
            </div>
            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">Open deals</span>
                <div className="stat-icon deals"><Briefcase size={17} /></div>
              </div>
              <span className="stat-value">{summary.openDealCount}</span>
              <span className="stat-detail">Active opportunities</span>
            </div>
            <div className="stat-card accent">
              <div className="stat-card-top">
                <span className="stat-label">Pipeline value</span>
                <div className="stat-icon"><TrendingUp size={17} /></div>
              </div>
              <span className="stat-value">{currency(summary.pipelineValue)}</span>
              <span className="stat-detail">Across open deals</span>
            </div>
            <div className="stat-card won">
              <div className="stat-card-top">
                <span className="stat-label">Won value</span>
                <div className="stat-icon"><Trophy size={17} /></div>
              </div>
              <span className="stat-value">{currency(summary.wonValue)}</span>
              <span className="stat-detail">Revenue secured</span>
            </div>
          </div>

          <section className="panel stage-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-eyebrow">SALES PIPELINE</span>
                <h2>Deals by stage</h2>
              </div>
              <Link className="panel-link" to="/deals">
                Explore deals <ArrowRight size={14} />
              </Link>
            </div>
            <div className="stage-bars">
              {summary.dealsByStage.map((row) => {
                const count = Number(row.count);
                return (
                  <div className="stage-bar-row" key={row.stage}>
                    <span className="stage-bar-label" style={{ textTransform: 'capitalize' }}>{row.stage}</span>
                    <div className="stage-bar-track">
                      <div className="stage-bar-fill" style={{ width: `${(count / maxStageCount) * 100}%` }} />
                    </div>
                    <span className="stage-bar-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </Layout>
  );
}