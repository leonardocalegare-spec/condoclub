import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import OrderStatusBadge from '../components/OrderStatusBadge'

const styles = {
  container: { padding: '32px 24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  title: { fontSize: '1.8rem', fontWeight: 700, color: '#1a1a2e', margin: '0 0 24px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: {
    background: '#fff',
    borderRadius: '10px',
    padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    transition: 'box-shadow 0.2s',
  },
  orderId: { fontSize: '0.8rem', color: '#888', fontFamily: 'monospace' },
  amount: { fontWeight: 700, fontSize: '1.1rem', color: '#16a34a' },
  date: { fontSize: '0.85rem', color: '#777' },
  empty: { textAlign: 'center', padding: '60px', color: '#888', fontSize: '1.1rem' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px' },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/orders')
        setOrders(res.data.orders || [])
      } catch {
        setError('Erro ao carregar pedidos.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div style={styles.container}><p>Carregando pedidos...</p></div>

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Meus Pedidos</h1>
      {error && <div style={styles.error}>{error}</div>}
      {orders.length === 0 ? (
        <p style={styles.empty}>Você ainda não tem pedidos.</p>
      ) : (
        <div style={styles.list}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={styles.card}
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <div>
                <p style={styles.orderId}>#{order.id.slice(0, 8)}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#444' }}>
                  {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'itens'}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
              <div style={{ textAlign: 'right' }}>
                <p style={styles.amount}>
                  {parseFloat(order.totalAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p style={styles.date}>
                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
