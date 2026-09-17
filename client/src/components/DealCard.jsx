const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function DealCard({ deal, onDragStart, onClick }) {
  return (
    <div
      className="deal-card"
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      onClick={() => onClick(deal)}
    >
      <div className="deal-card-title">{deal.title}</div>
      <div className="deal-card-company">{deal.contact?.company || deal.contact?.name || 'No contact'}</div>
      <div className="deal-card-value">{currency(deal.value)}</div>
    </div>
  );
}
