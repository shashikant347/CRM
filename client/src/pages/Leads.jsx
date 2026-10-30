import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import readXlsxFile from 'read-excel-file/browser';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];
const STATUS_LABELS = {
  new: 'New Inquiry',
  contacted: 'Talked',
  qualified: 'Interested',
  unqualified: 'Not Interested',
  converted: 'Deal Made',
};
const empty = { title: '', source: '', status: 'new', estimatedValue: 0, contactId: '' };
const IMPORT_COLUMNS = [
  ['Customer Name', 'customerName'],
  ['Email', 'email'],
  ['Phone', 'phone'],
  ['Company', 'company'],
  ['Lead Title', 'leadTitle'],
  ['Source', 'source'],
  ['Estimated Value', 'estimatedValue'],
  ['Sales Email', 'salesEmail'],
];

function normalizeHeader(value) {
  return String(value).replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === ',') {
      row.push(cell);
      cell = '';
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error('The CSV file has an unclosed quoted field.');
  row.push(cell);
  if (row.some((value) => String(value).trim())) rows.push(row);
  return rows;
}

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [filter, setFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/leads', { params: { status: filter || undefined } });
    setLeads(data);
    setLoading(false);
  }

  useEffect(() => {
    api.get('/contacts').then((res) => setContacts(res.data));
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api.get('/leads/import/assignees')
      .then((res) => setAssignees(res.data))
      .catch((err) => setImportError(err.response?.data?.error || 'Could not load sales reps'));
  }, [user?.role]);

  useEffect(() => { load(); }, [filter]); // eslint-disable-line

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    setImportRows([]);
    setImportFileName('');
    setImportError('');
    setImportResults(null);
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setImportError('File must be 10 MB or smaller.');
      return;
    }

    try {
      const sheetRows = file.name.toLowerCase().endsWith('.csv')
        ? parseCsv(await file.text())
        : await readXlsxFile(file);
      if (sheetRows.length < 2) throw new Error('The worksheet has no data rows.');

      const headers = sheetRows[0];
      const columnByKey = new Map(headers.map((header) => [normalizeHeader(header), header]));
      const missing = IMPORT_COLUMNS
        .filter(([label]) => !columnByKey.has(normalizeHeader(label)))
        .map(([label]) => label);
      if (missing.length) {
        throw new Error(`Missing columns: ${missing.join(', ')}. Download the template for the required format.`);
      }

      const columnIndexes = IMPORT_COLUMNS.map(([label]) => (
        headers.findIndex((header) => normalizeHeader(header) === normalizeHeader(label))
      ));
      const rows = sheetRows.slice(1)
        .filter((row) => row.some((value) => String(value ?? '').trim()))
        .map((row) => Object.fromEntries(
          IMPORT_COLUMNS.map(([, key], index) => [key, row[columnIndexes[index]] ?? ''])
        ));
      if (!rows.length) throw new Error('The worksheet has no data rows.');
      if (rows.length > 500) throw new Error('Upload a maximum of 500 lead rows at a time.');
      setImportRows(rows);
      setImportFileName(file.name);
    } catch (err) {
      setImportError(err.message || 'Could not read this spreadsheet.');
    } finally {
      event.target.value = '';
    }
  }

  function downloadImportTemplate() {
    const sampleRep = assignees[0]?.email || 'rep@example.com';
    const csv = [
      IMPORT_COLUMNS.map(([label]) => label),
      ['Aarav Customer', 'aarav@example.com', '9876543210', 'Example Company', 'Website inquiry', 'Website', 50000, sampleRep],
    ].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.href = url;
    link.download = 'crm-lead-import-template.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importLeads() {
    if (!importRows.length || importing) return;
    setImporting(true);
    setImportError('');
    setImportResults(null);
    try {
      const { data } = await api.post('/leads/import', { rows: importRows });
      setImportResults(data);
      setImportRows([]);
      setImportFileName('');
      await load();
    } catch (err) {
      setImportError(err.response?.data?.error || 'Could not import leads.');
    } finally {
      setImporting(false);
    }
  }

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

      {user?.role === 'admin' && (
        <section className="panel" style={{ marginBottom: 20 }}>
          <h2>Assign leads from Excel</h2>
          <p className="muted">
            One row per lead. Use each sales rep&apos;s email in the Sales Email column.
            Existing contacts with the same email are reused; contacts owned by another rep are not reassigned.
          </p>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" onClick={downloadImportTemplate}>
              Download CSV template for Excel
            </button>
            <label>
              Choose Excel file
              <input type="file" accept=".xlsx,.csv" onChange={handleImportFile} />
            </label>
          </div>
          {assignees.length === 0 && (
            <p className="muted">No sales reps are registered yet. Create sales-rep accounts before importing.</p>
          )}
          {importFileName && (
            <div style={{ marginTop: 12 }}>
              <p>{importFileName}: {importRows.length} lead row(s) ready to import.</p>
              <ul>
                {importRows.slice(0, 5).map((row, index) => (
                  <li key={`${row.salesEmail}-${row.leadTitle}-${index}`}>
                    Row {index + 2}: {row.leadTitle || 'Untitled'} → {row.salesEmail || 'No sales email'}
                  </li>
                ))}
              </ul>
              {importRows.length > 5 && <p className="muted">Showing the first 5 rows.</p>}
              <button
                type="button"
                className="btn-primary"
                onClick={importLeads}
                disabled={importing || assignees.length === 0}
              >
                {importing ? 'Importing…' : `Import ${importRows.length} lead(s)`}
              </button>
            </div>
          )}
          {importError && <div className="alert" style={{ marginTop: 12 }}>{importError}</div>}
          {importResults && (
            <div style={{ marginTop: 12 }}>
              <p>Imported {importResults.imported} lead(s); {importResults.failed} row(s) need attention.</p>
              {importResults.results.filter((result) => result.status === 'error').length > 0 && (
                <ul>
                  {importResults.results
                    .filter((result) => result.status === 'error')
                    .map((result) => <li key={result.row}>Row {result.row}: {result.message}</li>)}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

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
            <tr>
              <th>Lead</th><th>Contact</th><th>Source</th><th>Est. value</th>
              {user?.role === 'admin' && <th>Assigned to</th>}
              <th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td className="cell-strong"><Link to={`/leads/${l.id}`} className="table-link">{l.title}</Link></td>
                <td>{l.contact?.name || '—'}</td>
                <td>{l.source || '—'}</td>
                <td>₹{Number(l.estimatedValue).toLocaleString('en-IN')}</td>
                {user?.role === 'admin' && <td>{l.owner?.name || 'Unassigned'}</td>}
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