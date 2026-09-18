import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import DealCard from '../components/DealCard';
import api from '../api/client';

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const STAGE_LABELS = {
  new: 'Deal Opened', contacted: 'In Discussion', qualified: 'Budget Confirmed', proposal: 'Quote Sent', won: 'Deal Won', lost: 'Deal Lost',
};
const empty = {
  title: '', value: 0, stage: 'new', contactId: '', expectedCloseDate: '',
  paymentTerms: '', discountPercent: 0, taxAmount: 0, notes: '', attachmentUrl: '',
};

export default function Deals() {
  const navigate = useNavigate();
  const [board, setBoard] = useState({});
  const [contacts, setContacts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  async function load() {
    const { data } = await api.get('/deals/pipeline');
    setBoard(data);
  }

  useEffect(() => {
    load();
    api.get('/contacts').then((res) => setContacts(res.data));
  }, []);

  function openCreate() {
    setForm(empty);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(deal) {
    setForm({
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      contactId: deal.contactId || deal.contact?.id || '',
      expectedCloseDate: deal.expectedCloseDate || '',
      paymentTerms: deal.paymentTerms || '',
      discountPercent: deal.discountPercent || 0,
      taxAmount: deal.taxAmount || 0,
      notes: deal.notes || '',
      attachmentUrl: deal.attachmentUrl || '',
    });
    setEditingId(deal.id);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      value: Number(form.value) || 0,
      discountPercent: Number(form.discountPercent) || 0,
      taxAmount: Number(form.taxAmount) || 0,
      expectedCloseDate: form.expectedCloseDate || null,
    };
    if (editingId) {
      await api.put(`/deals/${editingId}`, payload);
    } else {
      await api.post('/deals', payload);
    }
    setModalOpen(false);
    load();
  }

  function handleDragStart(e, deal) {
    e.dataTransfer.setData('dealId', deal.id);
  }

  async function handleDrop(e, stage) {
    e.preventDefault();
    setDragOverStage(null);
    const dealId = e.dataTransfer.getData('dealId');
    if (!dealId) return;
    setBoard((prev) => {
      const next = { ...prev };
      let moved = null;
      for (const s of STAGES) {
        const idx = next[s]?.findIndex((d) => d.id === dealId);
        if (idx > -1) {
          moved = next[s][idx];
          next[s] = next[s].filter((d) => d.id !== dealId);
          break;
        }
      }
      if (moved) next[stage] = [{ ...moved, stage }, ...(next[stage] || [])];
      return next;
    });
    await api.patch(`/deals/${dealId}/stage`, { stage });
  }

  const totals = STAGES.reduce((acc, s) => {
    acc[s] = (board[s] || []).reduce((sum, d) => sum + Number(d.value), 0);
    return acc;
  }, {});

  // Final amount preview inside the form: value - discount% + tax
  const previewValue = Number(form.value) || 0;
  const previewDiscount = (previewValue * (Number(form.discountPercent) || 0)) / 100;
  const previewFinal = previewValue - previewDiscount + (Number(form.taxAmount) || 0);

  return (
    <Layout>
      <header className="page-header row">
        <div>
          <h1>Pipeline</h1>
          <p>Drag a deal across stages as it moves forward.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>Add deal</button>
      </header>

      <div className="board">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className={'board-column' + (dragOverStage === stage ? ' drag-over' : '')}
            onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="board-column-header">
              <span>{STAGE_LABELS[stage]}</span>
              <span className="board-column-total">₹{totals[stage].toLocaleString('en-IN')}</span>
            </div>
            <div className="board-column-body">
              {(board[stage] || []).map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onDragStart={handleDragStart}
                  onClick={(d) => navigate(`/deals/${d.id}`)}
                  onEdit={openEdit}
                />
              ))}
              {(board[stage] || []).length === 0 && <div className="board-empty">No deals</div>}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <Modal title={editingId ? 'Edit deal' : 'New deal'} onClose={() => setModalOpen(false)} width={560}>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>Title
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label>Contact
              <select required value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
                <option value="">Select a contact</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
              </select>
            </label>

            <div className="form-row-2">
              <label>Value (₹)
                <input type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </label>
              <label>Stage
                <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                  {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                </select>
              </label>
            </div>

            <label>Expected close date
              <input type="date" value={form.expectedCloseDate?.slice?.(0, 10) || form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} />
            </label>

            <div className="form-section-label">Payment &amp; pricing</div>

            <label>Payment terms
              <input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="e.g. 50% advance, 50% on delivery" />
            </label>

            <div className="form-row-2">
              <label>Discount (%)
                <input type="number" min="0" max="100" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
              </label>
              <label>Tax / GST amount (₹)
                <input type="number" min="0" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} />
              </label>
            </div>

            {previewValue > 0 && (
              <div className="price-preview">
                <span>Final amount after discount + tax</span>
                <strong>₹{previewFinal.toLocaleString('en-IN')}</strong>
              </div>
            )}

            <div className="form-section-label">Notes &amp; documents</div>

            <label>Notes
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any extra context about this deal…" />
            </label>

            <label>Attachment link (quotation, contract, etc.)
              <input type="url" value={form.attachmentUrl} onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })} placeholder="https://drive.google.com/…" />
            </label>
            {form.attachmentUrl && (
              <a href={form.attachmentUrl} target="_blank" rel="noreferrer" className="link-btn">Open current attachment ↗</a>
            )}

            <button className="btn-primary" type="submit">{editingId ? 'Save changes' : 'Add deal'}</button>
          </form>
        </Modal>
      )}
    </Layout>
  );
}