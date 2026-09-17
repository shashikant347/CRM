import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';

const TYPES = ['note', 'call', 'email', 'meeting', 'task'];
const empty = { type: 'note', content: '', relatedType: 'contact', relatedId: '', dueAt: '' };

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/activities', { params: { type: typeFilter || undefined } });
    setActivities(data);
    setLoading(false);
  }

  useEffect(() => {
    api.get('/contacts').then((res) => setContacts(res.data));
    api.get('/leads').then((res) => setLeads(res.data));
    api.get('/deals').then((res) => setDeals(res.data));
  }, []);

  useEffect(() => { load(); }, [typeFilter]); // eslint-disable-line

  function optionsForRelatedType(type) {
    if (type === 'contact') return contacts.map((c) => ({ id: c.id, label: c.name }));
    if (type === 'lead') return leads.map((l) => ({ id: l.id, label: l.title }));
    return deals.map((d) => ({ id: d.id, label: d.title }));
  }

  function openCreate() {
    setForm(empty);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.relatedId) return;
    await api.post('/activities', {
      ...form,
      dueAt: form.dueAt || null,
    });
    setModalOpen(false);
    load();
  }

  async function toggleComplete(activity) {
    await api.put(`/activities/${activity.id}`, { completed: !activity.completed });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this activity?')) return;
    await api.delete(`/activities/${id}`);
    load();
  }

  return (
    <Layout>
      <header className="page-header row">
        <div>
          <h1>Activities</h1>
          <p>Notes, calls, emails, meetings and tasks across all records.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>Add activity</button>
      </header>

      <div className="filter-row">
        <button className={'chip' + (typeFilter === '' ? ' active' : '')} onClick={() => setTypeFilter('')}>All</button>
        {TYPES.map((t) => (
          <button key={t} className={'chip' + (typeFilter === t ? ' active' : '')} onClick={() => setTypeFilter(t)}>{t}</button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : activities.length === 0 ? (
        <div className="empty-state">No activities logged yet.</div>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Done</th><th>Type</th><th>Note</th><th>Linked to</th><th>Due</th><th></th></tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.id}>
                <td>
                  <input type="checkbox" checked={a.completed} onChange={() => toggleComplete(a)} />
                </td>
                <td style={{ textTransform: 'capitalize' }}>{a.type}</td>
                <td>{a.content}</td>
                <td>{a.relatedLabel} <span className="muted">({a.relatedType})</span></td>
                <td>{a.dueAt ? new Date(a.dueAt).toLocaleDateString('en-IN') : '—'}</td>
                <td className="row-actions">
                  <button className="link-btn danger" onClick={() => handleDelete(a.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <Modal title="New activity" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>Note / description
              <input required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="e.g. Called to confirm budget" />
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
            <label>Due date (optional)
              <input type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
            </label>
            <button className="btn-primary" type="submit">Add activity</button>
          </form>
        </Modal>
      )}
    </Layout>
  );
}