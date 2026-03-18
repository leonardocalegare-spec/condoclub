import React from 'react'

const categoryLabels = {
  VEHICLE_WASH: 'Lavagem de Veículo',
  CLEANING: 'Limpeza',
  MAINTENANCE: 'Manutenção',
  DELIVERY: 'Entrega',
  INSURANCE: 'Seguro',
  HOME_SERVICES: 'Serviços Domésticos',
  GYM: 'Academia',
  INTERNET: 'Internet',
  COURSES: 'Cursos',
  OTHER: 'Outros',
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  name: { margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1a1a2e' },
  description: { margin: 0, fontSize: '0.9rem', color: '#555', flexGrow: 1 },
  badge: {
    display: 'inline-block',
    background: '#e0edff',
    color: '#1a56db',
    borderRadius: '20px',
    padding: '3px 10px',
    fontSize: '0.78rem',
    fontWeight: 500,
    width: 'fit-content',
  },
  price: { fontSize: '1.3rem', fontWeight: 700, color: '#16a34a' },
  supplier: { fontSize: '0.82rem', color: '#777' },
  btn: {
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 500,
    marginTop: '4px',
  },
}

export default function ServiceCard({ service, onHire }) {
  const price = parseFloat(service.price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <div style={styles.card}>
      <h3 style={styles.name}>{service.name}</h3>
      <span style={styles.badge}>{categoryLabels[service.category] || service.category}</span>
      <p style={styles.description}>{service.description || 'Sem descrição disponível.'}</p>
      <p style={styles.price}>{price}</p>
      <p style={styles.supplier}>Fornecedor: {service.supplier?.name || '—'}</p>
      <button style={styles.btn} onClick={() => onHire(service)}>
        Contratar
      </button>
    </div>
  )
}
