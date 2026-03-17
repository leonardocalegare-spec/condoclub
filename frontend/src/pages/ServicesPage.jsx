import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import ServiceCard from '../components/ServiceCard'

const categories = [
  { value: '', label: 'Todas as categorias' },
  { value: 'VEHICLE_WASH', label: 'Lavagem de Veículo' },
  { value: 'CLEANING', label: 'Limpeza' },
  { value: 'MAINTENANCE', label: 'Manutenção' },
  { value: 'DELIVERY', label: 'Entrega' },
  { value: 'INSURANCE', label: 'Seguro' },
  { value: 'HOME_SERVICES', label: 'Serviços Domésticos' },
  { value: 'GYM', label: 'Academia' },
  { value: 'INTERNET', label: 'Internet' },
  { value: 'COURSES', label: 'Cursos' },
  { value: 'OTHER', label: 'Outros' },
]

const styles = {
  container: { padding: '32px 24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  header: { marginBottom: '28px' },
  title: { fontSize: '1.8rem', fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px' },
  filters: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  input: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '0.95rem',
  },
  select: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '0.95rem',
    background: '#fff',
    minWidth: '180px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  empty: { textAlign: 'center', padding: '60px', color: '#888', fontSize: '1.1rem' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px' },
}

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hiring, setHiring] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const params = {}
        if (search) params.search = search
        if (category) params.category = category
        const res = await api.get('/services', { params })
        setServices(res.data.services || [])
      } catch {
        setError('Erro ao carregar serviços.')
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [search, category])

  async function handleHire(service) {
    if (hiring) return
    setHiring(service.id)
    setError('')
    try {
      const res = await api.post('/orders', {
        items: [{ serviceId: service.id, quantity: 1 }],
      })
      navigate(`/orders/${res.data.order.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar pedido. Tente novamente.')
    } finally {
      setHiring(null)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Serviços Disponíveis</h1>
        <div style={styles.filters}>
          <input
            style={styles.input}
            type="text"
            placeholder="Buscar serviços..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select style={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <p style={styles.empty}>Carregando serviços...</p>
      ) : services.length === 0 ? (
        <p style={styles.empty}>Nenhum serviço encontrado.</p>
      ) : (
        <div style={styles.grid}>
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} onHire={handleHire} />
          ))}
        </div>
      )}
    </div>
  )
}
