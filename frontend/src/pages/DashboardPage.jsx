import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const roleLabels = {
  PLATFORM_ADMIN: 'Administrador da Plataforma',
  CONDO_MANAGER: 'Síndico / Gestor',
  RESIDENT: 'Morador',
  SUPPLIER: 'Fornecedor',
}

const styles = {
  container: { padding: '32px 24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  welcome: { marginBottom: '32px' },
  title: { fontSize: '1.8rem', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' },
  sub: { color: '#555', fontSize: '1rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' },
  statCard: {
    background: '#fff',
    borderRadius: '10px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  statValue: { fontSize: '2rem', fontWeight: 800, color: '#1a56db', margin: '0 0 6px' },
  statLabel: { fontSize: '0.85rem', color: '#666' },
  actions: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  actionCard: {
    background: '#1a56db',
    color: '#fff',
    borderRadius: '10px',
    padding: '20px 28px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ orders: 0, services: 0 })

  useEffect(() => {
    async function loadStats() {
      try {
        const ordersRes = await api.get('/orders')
        const orders = ordersRes.data.orders || []
        let services = 0
        if (user?.role === 'SUPPLIER' || user?.role === 'PLATFORM_ADMIN') {
          const svcRes = await api.get('/services')
          services = (svcRes.data.services || []).length
        }
        setStats({ orders: orders.length, services })
      } catch {
        // ignore
      }
    }
    loadStats()
  }, [user])

  return (
    <div style={styles.container}>
      <div style={styles.welcome}>
        <h1 style={styles.title}>Olá, {user?.name}! 👋</h1>
        <p style={styles.sub}>{roleLabels[user?.role] || user?.role}</p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statValue}>{stats.orders}</p>
          <p style={styles.statLabel}>Pedidos</p>
        </div>
        {(user?.role === 'SUPPLIER' || user?.role === 'PLATFORM_ADMIN') && (
          <div style={styles.statCard}>
            <p style={styles.statValue}>{stats.services}</p>
            <p style={styles.statLabel}>Serviços</p>
          </div>
        )}
      </div>

      <div style={styles.actions}>
        <Link to="/services" style={styles.actionCard}>🛠️ Ver Serviços</Link>
        <Link to="/orders" style={styles.actionCard}>📦 Meus Pedidos</Link>
      </div>
    </div>
  )
}
