import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [activeOwnerId, setActiveOwnerId] = useState(''); // '' = All
  const [expandedOwners, setExpandedOwners] = useState(() => new Set());
  const PREVIEW_COUNT = 6;

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

  // Group contacts by the person who added them (owner)
  const groups = useMemo(() => {
    const map = {};
    contacts.forEach((c) => {
      const key = c.owner?.id || 'unassigned';
      if (!map[key]) {
        map[key] = { owner: c.owner || { id: 'unassigned', name: 'Unassigned', role: '' }, items: [] };
      }
      map[key].items.push(c);
    });
    return Object.values(map).sort((a, b) => a.owner.name.localeCompare(b.owner.name));
  }, [contacts]);

  const visibleGroups = activeOwnerId
    ? groups.filter((g) => g.owner.id === activeOwnerId)
    : groups;

  function toggleExpanded(ownerId) {
    setExpandedOwners((prev) => {
      const next = new Set(prev);
      if (next.has(ownerId)) next.delete(ownerId);
      else next.add(ownerId);
      return next;
    });
  }

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

      {!loading && groups.length > 0 && (
        <div className="filter-row">
          <button className={'chip' + (activeOwnerId === '' ? ' active' : '')} onClick={() => setActiveOwnerId('')}>
            All
          </button>
          {groups.map((g) => (
            <button
              key={g.owner.id}
              className={'chip' + (activeOwnerId === g.owner.id ? ' active' : '')}
              onClick={() => setActiveOwnerId(g.owner.id)}
            >
              {g.owner.name} <span className="chip-count">{g.items.length}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : contacts.length === 0 ? (
        <div className="empty-state">No contacts yet. Add your first one to get started.</div>
      ) : (
        visibleGroups.map((group) => {
          const isExpanded = expandedOwners.has(group.owner.id);
          const visibleItems = isExpanded ? group.items : group.items.slice(0, PREVIEW_COUNT);
          const hasMore = group.items.length > PREVIEW_COUNT;

          return (
            <section className="owner-group" key={group.owner.id}>
              <div className="owner-group-header">
                <button
                  type="button"
                  className="owner-group-name"
                  onClick={() => setActiveOwnerId(group.owner.id)}
                  title={`Show only ${group.owner.name}'s contacts`}
                >
                  {group.owner.name}
                </button>
                {group.owner.role && (
                  <span className="owner-role-badge">{group.owner.role.replace('_', ' ')}</span>
                )}
                <span className="owner-group-count">
                  {group.items.length} contact{group.items.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="contact-grid">
                {visibleItems.map((c) => (
                  <div className="contact-card" key={c.id}>
                    <div className="contact-card-top">
                      <div className="contact-card-avatar">{c.name?.[0]?.toUpperCase() || '?'}</div>
                      <div>
                        <Link to={`/contacts/${c.id}`} className="contact-card-name contact-card-name-link">{c.name}</Link>
                        <div className="contact-card-role">
                          {c.jobTitle || '—'}{c.company ? ` · ${c.company}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="contact-card-meta">
                      <div>{c.email || '—'}</div>
                      <div>{c.phone || '—'}</div>
                    </div>
                    <div className="contact-card-footer">
                      <button
                        type="button"
                        className="owner-tag"
                        onClick={() => setActiveOwnerId(group.owner.id)}
                      >
                        Added by {group.owner.name}
                      </button>
                      <div className="row-actions">
                        <button className="link-btn" onClick={() => openEdit(c)}>Edit</button>
                        <button className="link-btn danger" onClick={() => handleDelete(c.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <button type="button" className="show-all-btn" onClick={() => toggleExpanded(group.owner.id)}>
                  {isExpanded ? 'Show less' : `Show all (${group.items.length})`}
                </button>
              )}
            </section>
          );
        })
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