import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import DealCard from '../components/DealCard';
import api from '../api/client';

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const STAGE_LABELS = {
  new: 'Deal Opened', contacted: 'In Discussion', qualified: 'Budget Confirmed', proposal: 'Quote Sent', won: 'Deal Won', lost: 'Deal Lost',
};
const empty = { title: '', value: 0, stage: 'new', contactId: '', expectedCloseDate: '' };

export default function Deals() {
  const [board, setBoard] = useState({});
  const [contacts, setContacts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [selectedDeal, setSelectedDeal] = useState(null);
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
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await api.post('/deals', { ...form, value: Number(form.value) || 0, expectedCloseDate: form.expectedCloseDate || null });
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
    // Optimistic update
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
                <DealCard key={deal.id} deal={deal} onDragStart={handleDragStart} onClick={setSelectedDeal} />
              ))}
              {(board[stage] || []).length === 0 && <div className="board-empty">No deals</div>}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <Modal title="New deal" onClose={() => setModalOpen(false)}>
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
            <label>Value (₹)
              <input type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </label>
            <label>Stage
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </label>
            <label>Expected close date
              <input type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} />
            </label>
            <button className="btn-primary" type="submit">Add deal</button>
          </form>
        </Modal>
      )}

      {selectedDeal && (
        <Modal title={selectedDeal.title} onClose={() => setSelectedDeal(null)}>
          <div className="deal-detail">
            <p><strong>Contact:</strong> {selectedDeal.contact?.name || '—'}</p>
            <p><strong>Value:</strong> ₹{Number(selectedDeal.value).toLocaleString('en-IN')}</p>
            <p><strong>Stage:</strong> {STAGE_LABELS[selectedDeal.stage]}</p>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
