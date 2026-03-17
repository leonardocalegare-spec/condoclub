import React from 'react'

const statusConfig = {
  PENDING: { label: 'Pendente', background: '#fef9c3', color: '#854d0e' },
  PAID: { label: 'Pago', background: '#dbeafe', color: '#1e40af' },
  IN_PROGRESS: { label: 'Em Andamento', background: '#ffedd5', color: '#9a3412' },
  COMPLETED: { label: 'Concluído', background: '#dcfce7', color: '#166534' },
  CANCELLED: { label: 'Cancelado', background: '#fee2e2', color: '#991b1b' },
}

export default function OrderStatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, background: '#f3f4f6', color: '#374151' }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: 600,
        background: config.background,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  )
}
