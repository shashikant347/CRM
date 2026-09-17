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

export default function ContactDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/contacts/${id}/timeline`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load this contact'))
      .finally(() => setLoading(false));
  }, [id]);

  // Merge every source into one chronological feed.
  const timeline = useMemo(() => {
    if (!data) return [];
    const dealTitleById = Object.fromEntries(data.deals.map((d) => [d.id, d.title]));
    const events = [];

    data.leads.forEach((l) => events.push({
      date: l.createdAt, kind: 'lead', icon: Target,
      title: `Lead created: ${l.title}`,
      meta: `Status: ${l.status}${l.estimatedValue ? ` · Est. ${currency(l.estimatedValue)}` : ''}`,
    }));

    data.deals.forEach((d) => events.push({
      date: d.createdAt, kind: 'deal', icon: Briefcase,
      title: `Deal created: ${d.title}`,
      meta: `${currency(d.value)}`,
    }));

    data.stageHistory.forEach((sh) => events.push({
      date: sh.changedAt, kind: 'stage', icon: ArrowRightLeft,
      title: `${dealTitleById[sh.dealId] || 'Deal'}: ${sh.fromStage ? sh.fromStage : 'opened'} → ${sh.toStage}`,
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
    return (
      <Layout>
        <p className="muted">Loading…</p>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="empty-state">{error || 'Contact not found.'}</div>
      </Layout>
    );
  }

  const { contact, leads, deals } = data;

  return (
    <Layout>
      <Link to="/contacts" className="back-link"><ArrowLeft size={15} /> Back to contacts</Link>

      <header className="page-header row" style={{ marginTop: 10 }}>
        <div className="contact-profile-head">
          <div className="contact-card-avatar" style={{ width: 52, height: 52, fontSize: '1.3rem' }}>
            {contact.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h1>{contact.name}</h1>
            <p>
              {contact.jobTitle || '—'}{contact.company ? ` · ${contact.company}` : ''}
              {contact.owner && <> · Added by {contact.owner.name}</>}
            </p>
          </div>
        </div>
      </header>

      <div className="contact-profile-meta">
        <div><span className="muted">Email</span><div>{contact.email || '—'}</div></div>
        <div><span className="muted">Phone</span><div>{contact.phone || '—'}</div></div>
        <div><span className="muted">Leads</span><div>{leads.length}</div></div>
        <div><span className="muted">Deals</span><div>{deals.length}</div></div>
      </div>

      <section className="panel">
        <h2>history</h2>
        {timeline.length === 0 ? (
          <div className="empty-state">Nothing logged for this contact yet.</div>
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