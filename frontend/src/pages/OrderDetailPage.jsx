import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import OrderStatusBadge from '../components/OrderStatusBadge'

const styles = {
  container: { padding: '32px 24px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  back: { background: 'none', border: 'none', color: '#1a56db', cursor: 'pointer', fontSize: '0.95rem', marginBottom: '20px', padding: 0 },
  card: { background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  orderId: { fontSize: '0.85rem', color: '#888', fontFamily: 'monospace', marginBottom: '6px' },
  date: { fontSize: '0.9rem', color: '#777' },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px', borderBottom: '1px solid #eee', paddingBottom: '8px' },
  itemRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: '0.95rem' },
  total: { display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', fontWeight: 700, fontSize: '1.1rem' },
  cancelBtn: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 24px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 600,
    marginTop: '4px',
  },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px' },
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/orders/${id}`)
        setOrder(res.data.order)
      } catch {
        setError('Pedido não encontrado.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleCancel() {
    if (!window.confirm('Deseja cancelar este pedido?')) return
    setCancelling(true)
    try {
      const res = await api.patch(`/orders/${id}/status`, { status: 'CANCELLED' })
      setOrder(res.data.order)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao cancelar pedido.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <div style={styles.container}><p>Carregando...</p></div>
  if (error) return <div style={styles.container}><div style={styles.error}>{error}</div></div>
  if (!order) return null

  const total = parseFloat(order.totalAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={() => navigate('/orders')}>← Voltar para pedidos</button>

      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <p style={styles.orderId}>Pedido #{order.id.slice(0, 8)}…{order.id.slice(-4)}</p>
            <p style={styles.date}>
              {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <h3 style={styles.sectionTitle}>Itens do Pedido</h3>
        {order.items?.map((item) => (
          <div key={item.id} style={styles.itemRow}>
            <span>
              {item.service?.name} × {item.quantity}
            </span>
            <span>
              {parseFloat(item.totalPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        ))}

        <div style={styles.total}>
          <span>Total</span>
          <span style={{ color: '#16a34a' }}>{total}</span>
        </div>
      </div>

      {order.status === 'PENDING' && (
        <button style={styles.cancelBtn} onClick={handleCancel} disabled={cancelling}>
          {cancelling ? 'Cancelando...' : 'Cancelar Pedido'}
        </button>
      )}
    </div>
  )
}
