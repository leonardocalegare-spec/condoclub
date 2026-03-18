import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f4ff',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  title: { textAlign: 'center', marginBottom: '28px', color: '#1a1a2e', fontSize: '1.4rem', fontWeight: 700 },
  label: { display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#444', fontWeight: 500 },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '0.95rem',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '0.95rem',
    marginBottom: '16px',
    boxSizing: 'border-box',
    background: '#fff',
  },
  btn: {
    width: '100%',
    padding: '12px',
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '4px',
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '0.9rem',
  },
  success: {
    background: '#dcfce7',
    color: '#166534',
    padding: '10px 14px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '0.9rem',
  },
  footer: { textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#555' },
  link: { color: '#1a56db', textDecoration: 'none', fontWeight: 500 },
}

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'resident' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      setSuccess('Cadastro realizado com sucesso! Redirecionando...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data?.errors?.[0]?.msg
        || 'Erro ao cadastrar. Tente novamente.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🏢 Criar conta no CondoClub</h1>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Nome completo</label>
          <input
            style={styles.input}
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="João Silva"
            required
          />
          <label style={styles.label}>E-mail</label>
          <input
            style={styles.input}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="seu@email.com"
            required
          />
          <label style={styles.label}>Senha</label>
          <input
            style={styles.input}
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />
          <label style={styles.label}>Perfil</label>
          <select style={styles.select} name="role" value={form.role} onChange={handleChange}>
            <option value="resident">Morador</option>
            <option value="supplier">Fornecedor</option>
            <option value="condo_manager">Síndico / Gestor</option>
          </select>
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </button>
        </form>
        <p style={styles.footer}>
          Já tem conta?{' '}
          <Link to="/login" style={styles.link}>Entrar</Link>
        </p>
      </div>
    </div>
  )
}
