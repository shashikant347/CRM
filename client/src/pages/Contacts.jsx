import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';

const empty = { name: '', email: '', phone: '', company: '', jobTitle: '' };

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/contacts', { params: { search: search || undefined } });
    setContacts(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line

  function openCreate() {
    setForm(empty);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(contact) {
    setForm({ name: contact.name, email: contact.email || '', phone: contact.phone || '', company: contact.company || '', jobTitle: contact.jobTitle || '' });
    setEditingId(contact.id);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (editingId) {
      await api.put(`/contacts/${editingId}`, form);
    } else {
      await api.post('/contacts', form);
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this contact?')) return;
    await api.delete(`/contacts/${id}`);
    load();
  }

  return (
    <Layout>
      <header className="page-header row">
        <div>
          <h1>Contacts</h1>
          <p>Everyone you're building a relationship with.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>Add contact</button>
      </header>

      <input
        className="search-input"
        placeholder="Search by name, email or company"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="muted">Loading…</p>
      ) : contacts.length === 0 ? (
        <div className="empty-state">No contacts yet. Add your first one to get started.</div>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th></th></tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td className="cell-strong">{c.name}</td>
                <td>{c.company || '—'}</td>
                <td>{c.email || '—'}</td>
                <td>{c.phone || '—'}</td>
                <td className="row-actions">
                  <button className="link-btn" onClick={() => openEdit(c)}>Edit</button>
                  <button className="link-btn danger" onClick={() => handleDelete(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <Modal title={editingId ? 'Edit contact' : 'New contact'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>Name
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>Company
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </label>
            <label>Job title
              <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            </label>
            <label>Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>Phone
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <button className="btn-primary" type="submit">{editingId ? 'Save changes' : 'Add contact'}</button>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
