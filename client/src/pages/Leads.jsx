import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';

const STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];
const STATUS_LABELS = {
  new: 'New Inquiry',
  contacted: 'Talked',
  qualified: 'Interested',
  unqualified: 'Not Interested',
  converted: 'Deal Made',
};
const empty = { title: '', source: '', status: 'new', estimatedValue: 0, contactId: '' };

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [filter, setFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/leads', { params: { status: filter || undefined } });
    setLeads(data);
    setLoading(false);
  }

  useEffect(() => {
    api.get('/contacts').then((res) => setContacts(res.data));
  }, []);

  useEffect(() => { load(); }, [filter]); // eslint-disable-line

  function openCreate() {
    setForm(empty);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await api.post('/leads', { ...form, estimatedValue: Number(form.estimatedValue) || 0 });
    setModalOpen(false);
    load();
  }

  async function handleStatusChange(lead, status) {
    await api.put(`/leads/${lead.id}`, { status });
    load();
  }

  async function handleConvert(lead) {
    await api.post(`/leads/${lead.id}/convert`);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this lead?')) return;
    await api.delete(`/leads/${id}`);
    load();
  }

  return (
    <Layout>
      <header className="page-header row">
        <div>
          <h1>Leads</h1>
          <p>Prospects working their way toward a deal.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>Add lead</button>
      </header>

      <div className="filter-row">
        <button className={'chip' + (filter === '' ? ' active' : '')} onClick={() => setFilter('')}>All</button>
        {STATUSES.map((s) => (
          <button key={s} className={'chip' + (filter === s ? ' active' : '')} onClick={() => setFilter(s)}>{STATUS_LABELS[s]}</button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : leads.length === 0 ? (
        <div className="empty-state">No leads match this view yet.</div>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Lead</th><th>Contact</th><th>Source</th><th>Est. value</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td className="cell-strong"><Link to={`/leads/${l.id}`} className="table-link">{l.title}</Link></td>
                <td>{l.contact?.name || '—'}</td>
                <td>{l.source || '—'}</td>
                <td>₹{Number(l.estimatedValue).toLocaleString('en-IN')}</td>
                <td>
                  <select value={l.status} onChange={(e) => handleStatusChange(l, e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </td>
                <td className="row-actions">
                  {l.status !== 'converted' && (
                    <button className="link-btn" onClick={() => handleConvert(l)}>Convert to deal</button>
                  )}
                  <button className="link-btn danger" onClick={() => handleDelete(l.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <Modal title="New lead" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>Title
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Website redesign inquiry" />
            </label>
            <label>Contact
              <select required value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
                <option value="">Select a contact</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
              </select>
            </label>
            <label>Source
              <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Referral, website, cold outreach…" />
            </label>
            <label>Estimated value (₹)
              <input type="number" min="0" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} />
            </label>
            <button className="btn-primary" type="submit">Add lead</button>
          </form>
        </Modal>
      )}
    </Layout>
  );
}