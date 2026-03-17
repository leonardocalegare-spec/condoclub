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

const roleBadgeColors = {
  PLATFORM_ADMIN: { background: '#1a1a2e', color: '#fff' },
  CONDO_MANAGER:  { background: '#2d6a4f', color: '#fff' },
  RESIDENT:       { background: '#2b6cb0', color: '#fff' },
  SUPPLIER:       { background: '#805ad5', color: '#fff' },
}

const styles = {
  container:  { padding: '32px 24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  welcome:    { marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  titleBlock: { flex: 1 },
  title:      { fontSize: '1.8rem', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' },
  sub:        { color: '#555', fontSize: '1rem', margin: 0 },
  roleBadge:  { padding: '6px 14px', borderRadius: '99px', fontSize: '.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' },
  statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' },
  statCard:   { background: '#fff', borderRadius: '10px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' },
  statValue:  { fontSize: '2rem', fontWeight: 800, color: '#1a56db', margin: '0 0 6px' },
  statLabel:  { fontSize: '0.82rem', color: '#666', textTransform: 'uppercase', letterSpacing: '.4px' },
  actions:    { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  actionCard: { background: '#1a56db', color: '#fff', borderRadius: '10px', padding: '20px 28px', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' },
  actionCardAlt: { background: '#fff', color: '#1a56db', border: '2px solid #1a56db', borderRadius: '10px', padding: '20px 28px', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px' },
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ orders: 0, services: 0 })
  const [adminStats, setAdminStats] = useState(null)

  const isAdmin = user?.role === 'PLATFORM_ADMIN' || user?.role === 'CONDO_MANAGER'

  useEffect(() => {
    async function loadStats() {
      try {
        if (isAdmin) {
          const res = await api.get('/admin/stats')
          setAdminStats(res.data.stats || null)
        } else {
          const ordersRes = await api.get('/orders')
          const orders = ordersRes.data.orders || []
          let services = 0
          if (user?.role === 'SUPPLIER') {
            const svcRes = await api.get('/services')
            services = (svcRes.data.services || []).length
          }
          setStats({ orders: orders.length, services })
        }
      } catch {
        // ignore
      }
    }
    loadStats()
  }, [user, isAdmin])

  const totalOrders = adminStats
    ? Object.values(adminStats.orders || {}).reduce((s, v) => s + v, 0)
    : 0

  return (
    <div style={styles.container}>
      {/* ── Welcome ── */}
      <div style={styles.welcome}>
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>Olá, {user?.name}! 👋</h1>
          <p style={styles.sub}>{roleLabels[user?.role] || user?.role}</p>
        </div>
        <span style={{ ...styles.roleBadge, ...(roleBadgeColors[user?.role] || { background: '#e2e8f0', color: '#333' }) }}>
          {user?.role}
        </span>
      </div>

      {/* ── Admin / Condo Manager ── */}
      {isAdmin && adminStats && (
        <>
          <p style={styles.sectionTitle}>📊 Visão Geral da Plataforma</p>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <p style={styles.statValue}>{adminStats.condos ?? '—'}</p>
              <p style={styles.statLabel}>Condomínios</p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statValue}>{adminStats.suppliers ?? '—'}</p>
              <p style={styles.statLabel}>Fornecedores</p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statValue}>{totalOrders}</p>
              <p style={styles.statLabel}>Pedidos</p>
            </div>
            <div style={{ ...styles.statCard }}>
              <p style={{ ...styles.statValue, color: '#38a169' }}>
                {(adminStats.financials?.gmv ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p style={styles.statLabel}>GMV Total</p>
            </div>
            <div style={{ ...styles.statCard }}>
              <p style={{ ...styles.statValue, color: '#805ad5' }}>
                {(adminStats.financials?.revenue ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p style={styles.statLabel}>Receita Comissões</p>
            </div>
          </div>
          <div style={styles.actions}>
            <Link to="/services" style={styles.actionCard}>🛠️ Serviços</Link>
            <Link to="/orders" style={styles.actionCard}>📦 Pedidos</Link>
          </div>
        </>
      )}

      {/* ── Resident ── */}
      {user?.role === 'RESIDENT' && (
        <>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <p style={styles.statValue}>{stats.orders}</p>
              <p style={styles.statLabel}>Meus Pedidos</p>
            </div>
          </div>
          <div style={styles.actions}>
            <Link to="/services" style={styles.actionCard}>🛠️ Ver Serviços</Link>
            <Link to="/orders" style={styles.actionCardAlt}>📦 Meus Pedidos</Link>
          </div>
        </>
      )}

      {/* ── Supplier ── */}
      {user?.role === 'SUPPLIER' && (
        <>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <p style={styles.statValue}>{stats.orders}</p>
              <p style={styles.statLabel}>Pedidos Recebidos</p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statValue}>{stats.services}</p>
              <p style={styles.statLabel}>Meus Serviços</p>
            </div>
          </div>
          <div style={styles.actions}>
            <Link to="/services" style={styles.actionCard}>🛠️ Gerenciar Serviços</Link>
            <Link to="/orders" style={styles.actionCardAlt}>📦 Ver Pedidos</Link>
          </div>
        </>
      )}
    </div>
  )
}

