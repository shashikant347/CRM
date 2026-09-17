import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';

const empty = {
  title: '', notes: '', scheduledAt: '', durationMinutes: 30, location: '',
  relatedType: 'contact', relatedId: '',
};

function toLocalInputValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [showPastToo, setShowPastToo] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/meetings', { params: showPastToo ? {} : { upcoming: 'true' } });
    setMeetings(data);
    setLoading(false);
  }

  useEffect(() => {
    api.get('/contacts').then((res) => setContacts(res.data));
    api.get('/leads').then((res) => setLeads(res.data));
    api.get('/deals').then((res) => setDeals(res.data));
  }, []);

  useEffect(() => { load(); }, [showPastToo]); // eslint-disable-line

  function optionsForRelatedType(type) {
    if (type === 'contact') return contacts.map((c) => ({ id: c.id, label: c.name }));
    if (type === 'lead') return leads.map((l) => ({ id: l.id, label: l.title }));
    return deals.map((d) => ({ id: d.id, label: d.title }));
  }

  function openCreate() {
    setForm({ ...empty, scheduledAt: toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)) });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.relatedId) return;
    await api.post('/meetings', {
      ...form,
      durationMinutes: Number(form.durationMinutes) || 30,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
    });
    setModalOpen(false);
    load();
  }

  async function markCompleted(meeting) {
    await api.put(`/meetings/${meeting.id}`, { status: 'completed' });
    load();
  }

  async function cancelMeeting(meeting) {
    await api.put(`/meetings/${meeting.id}`, { status: 'cancelled' });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this meeting?')) return;
    await api.delete(`/meetings/${id}`);
    load();
  }

  function formatWhen(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <Layout>
      <header className="page-header row">
        <div>
          <h1>Meetings</h1>
          <p>Calls and meetings scheduled against contacts, leads and deals.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>Schedule meeting</button>
      </header>

      <div className="filter-row">
        <button className={'chip' + (!showPastToo ? ' active' : '')} onClick={() => setShowPastToo(false)}>Upcoming</button>
        <button className={'chip' + (showPastToo ? ' active' : '')} onClick={() => setShowPastToo(true)}>All</button>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : meetings.length === 0 ? (
        <div className="empty-state">No meetings scheduled yet.</div>
      ) : (
        <table className="table">
          <thead>
            <tr><th>When</th><th>Meeting</th><th>Linked to</th><th>Location</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m.id}>
                <td className="cell-strong">{formatWhen(m.scheduledAt)}</td>
                <td>{m.title} <span className="muted">({m.durationMinutes} min)</span></td>
                <td>{m.relatedLabel} <span className="muted">({m.relatedType})</span></td>
                <td>{m.location || '—'}</td>
                <td style={{ textTransform: 'capitalize' }}>{m.status}</td>
                <td className="row-actions">
                  {m.status === 'scheduled' && (
                    <>
                      <button className="link-btn" onClick={() => markCompleted(m)}>Mark done</button>
                      <button className="link-btn danger" onClick={() => cancelMeeting(m)}>Cancel</button>
                    </>
                  )}
                  <button className="link-btn danger" onClick={() => handleDelete(m.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <Modal title="Schedule meeting" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>Title
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Discuss proposal" />
            </label>
            <label>Link to
              <select
                value={form.relatedType}
                onChange={(e) => setForm({ ...form, relatedType: e.target.value, relatedId: '' })}
              >
                <option value="contact">Contact</option>
                <option value="lead">Lead</option>
                <option value="deal">Deal</option>
              </select>
            </label>
            <label>{form.relatedType.charAt(0).toUpperCase() + form.relatedType.slice(1)}
              <select required value={form.relatedId} onChange={(e) => setForm({ ...form, relatedId: e.target.value })}>
                <option value="">Select {form.relatedType}</option>
                {optionsForRelatedType(form.relatedType).map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </label>
            <div className="form-row-2">
              <label>Date &amp; time
                <input type="datetime-local" required value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
              </label>
              <label>Duration (minutes)
                <input type="number" min="5" step="5" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
              </label>
            </div>
            <label>Location / link
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Office, phone number, or Google Meet link" />
            </label>
            <label>Notes
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Agenda or context…" />
            </label>
            <button className="btn-primary" type="submit">Schedule meeting</button>
          </form>
        </Modal>
      )}
    </Layout>
  );
}