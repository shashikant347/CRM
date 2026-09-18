import { Pencil } from 'lucide-react';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function DealCard({ deal, onDragStart, onClick, onEdit }) {
  return (
    <div
      className="deal-card"
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      onClick={() => onClick(deal)}
    >
      <div className="deal-card-top">
        <div className="deal-card-title">{deal.title}</div>
        <button
          type="button"
          className="deal-card-edit"
          title="Edit deal"
          onClick={(e) => { e.stopPropagation(); onEdit(deal); }}
        >
          <Pencil size={13} />
        </button>
      </div>
      <div className="deal-card-company">{deal.contact?.company || deal.contact?.name || 'No contact'}</div>
      <div className="deal-card-value">{currency(deal.value)}</div>
    </div>
  );
}