import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import {
  ArrowLeft, Target, Briefcase, ArrowRightLeft, Phone, Mail,
  StickyNote, CheckSquare, CalendarClock,
} from 'lucide-react';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const ACTIVITY_ICON = { note: StickyNote, call: Phone, email: Mail, task: CheckSquare, meeting: CalendarClock };

function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LeadDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/leads/${id}/timeline`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load this lead'))
      .finally(() => setLoading(false));
  }, [id]);

  const timeline = useMemo(() => {
    if (!data) return [];
    const events = [];

    events.push({
      date: data.lead.createdAt, kind: 'lead', icon: Target,
      title: `Lead created: ${data.lead.title}`,
      meta: `Status: ${data.lead.status}${data.lead.estimatedValue ? ` · Est. ${currency(data.lead.estimatedValue)}` : ''}`,
    });

    if (data.deal) {
      events.push({
        date: data.deal.createdAt, kind: 'deal', icon: Briefcase,
        title: `Converted to deal: ${data.deal.title}`,
        meta: currency(data.deal.value),
      });
    }

    data.stageHistory.forEach((sh) => events.push({
      date: sh.changedAt, kind: 'stage', icon: ArrowRightLeft,
      title: `Deal stage: ${sh.fromStage ? sh.fromStage : 'opened'} → ${sh.toStage}`,
      meta: null,
    }));

    data.activities.forEach((a) => events.push({
      date: a.createdAt, kind: a.type, icon: ACTIVITY_ICON[a.type] || StickyNote,
      title: a.content,
      meta: `${a.type}${a.completed ? ' · done' : ''}`,
    }));

    data.meetings.forEach((m) => events.push({
      date: m.scheduledAt, kind: 'meeting', icon: CalendarClock,
      title: m.title,
      meta: `Meeting · ${m.status}${m.location ? ` · ${m.location}` : ''}`,
    }));

    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data]);

  if (loading) {
    return <Layout><p className="muted">Loading…</p></Layout>;
  }
  if (error || !data) {
    return <Layout><div className="empty-state">{error || 'Lead not found.'}</div></Layout>;
  }

  const { lead } = data;

  return (
    <Layout>
      <Link to="/leads" className="back-link"><ArrowLeft size={15} /> Back to leads</Link>

      <header className="page-header row" style={{ marginTop: 10 }}>
        <div>
          <h1>{lead.title}</h1>
          <p>
            {lead.contact ? <>For <Link to={`/contacts/${lead.contact.id}`}>{lead.contact.name}</Link></> : 'No contact linked'}
            {lead.owner && <> · Added by {lead.owner.name}</>}
          </p>
        </div>
      </header>

      <div className="contact-profile-meta">
        <div><span className="muted">Status</span><div style={{ textTransform: 'capitalize' }}>{lead.status}</div></div>
        <div><span className="muted">Source</span><div>{lead.source || '—'}</div></div>
        <div><span className="muted">Estimated value</span><div>{currency(lead.estimatedValue)}</div></div>
        <div><span className="muted">Converted deal</span><div>{data.deal ? currency(data.deal.value) : '—'}</div></div>
      </div>

      <section className="panel">
        <h2>Full history</h2>
        {timeline.length === 0 ? (
          <div className="empty-state">Nothing logged for this lead yet.</div>
        ) : (
          <div className="timeline">
            {timeline.map((ev, i) => {
              const Icon = ev.icon;
              return (
                <div className="timeline-row" key={i}>
                  <div className={`timeline-icon timeline-icon-${ev.kind}`}><Icon size={14} /></div>
                  <div className="timeline-content">
                    <div className="timeline-title">{ev.title}</div>
                    {ev.meta && <div className="timeline-meta">{ev.meta}</div>}
                  </div>
                  <div className="timeline-date">{formatWhen(ev.date)}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
}