import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import {
  ArrowLeft, Briefcase, ArrowRightLeft, Phone, Mail,
  StickyNote, CheckSquare, CalendarClock,
} from 'lucide-react';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const ACTIVITY_ICON = { note: StickyNote, call: Phone, email: Mail, task: CheckSquare, meeting: CalendarClock };

function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DealDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/deals/${id}/timeline`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load this deal'))
      .finally(() => setLoading(false));
  }, [id]);

  const timeline = useMemo(() => {
    if (!data) return [];
    const events = [];

    data.stageHistory.forEach((sh) => events.push({
      date: sh.changedAt, kind: sh.fromStage ? 'stage' : 'deal',
      icon: sh.fromStage ? ArrowRightLeft : Briefcase,
      title: sh.fromStage ? `Stage: ${sh.fromStage} → ${sh.toStage}` : `Deal created: ${data.deal.title}`,
      meta: sh.fromStage ? null : currency(data.deal.value),
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
    return <Layout><div className="empty-state">{error || 'Deal not found.'}</div></Layout>;
  }

  const { deal } = data;

  return (
    <Layout>
      <Link to="/deals" className="back-link"><ArrowLeft size={15} /> Back to pipeline</Link>

      <header className="page-header row" style={{ marginTop: 10 }}>
        <div>
          <h1>{deal.title}</h1>
          <p>
            {deal.contact ? <>For <Link to={`/contacts/${deal.contact.id}`}>{deal.contact.name}</Link></> : 'No contact linked'}
            {deal.lead && <> · From lead <Link to={`/leads/${deal.lead.id}`}>{deal.lead.title}</Link></>}
            {deal.owner && <> · Owned by {deal.owner.name}</>}
          </p>
        </div>
      </header>

      <div className="contact-profile-meta">
        <div><span className="muted">Stage</span><div style={{ textTransform: 'capitalize' }}>{deal.stage}</div></div>
        <div><span className="muted">Value</span><div>{currency(deal.value)}</div></div>
        <div><span className="muted">Expected close</span><div>{deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString('en-IN') : '—'}</div></div>
        <div><span className="muted">Probability</span><div>{deal.probability != null ? `${deal.probability}%` : '—'}</div></div>
      </div>

      <div className="contact-profile-meta">
        <div><span className="muted">Payment terms</span><div>{deal.paymentTerms || '—'}</div></div>
        <div><span className="muted">Discount</span><div>{deal.discountPercent ? `${deal.discountPercent}%` : '—'}</div></div>
        <div><span className="muted">Tax</span><div>{deal.taxAmount ? currency(deal.taxAmount) : '—'}</div></div>
        <div><span className="muted">Attachment</span><div>{deal.attachmentUrl ? <a href={deal.attachmentUrl} target="_blank" rel="noreferrer">View file</a> : '—'}</div></div>
      </div>

      {deal.notes && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h2>Notes</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{deal.notes}</p>
        </div>
      )}

      <section className="panel">
        <h2>Full history</h2>
        {timeline.length === 0 ? (
          <div className="empty-state">Nothing logged for this deal yet.</div>
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