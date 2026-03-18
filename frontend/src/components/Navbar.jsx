import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: '60px',
    background: '#1a56db',
    color: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
  },
  brand: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#fff',
    textDecoration: 'none',
  },
  links: { display: 'flex', gap: '20px', alignItems: 'center' },
  link: { color: '#fff', textDecoration: 'none', fontSize: '0.95rem' },
  btn: {
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  userInfo: { fontSize: '0.85rem', opacity: 0.85 },
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>🏢 CondoClub</Link>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Início</Link>
        {isAuthenticated && (
          <>
            <Link to="/services" style={styles.link}>Serviços</Link>
            <Link to="/orders" style={styles.link}>Meus Pedidos</Link>
          </>
        )}
        {isAuthenticated ? (
          <>
            <span style={styles.userInfo}>{user?.email}</span>
            <button style={styles.btn} onClick={handleLogout}>Sair</button>
          </>
        ) : (
          <>
            <Link to="/login" style={styles.link}>Login</Link>
            <Link to="/register" style={{ ...styles.btn, textDecoration: 'none' }}>Cadastrar</Link>
          </>
        )}
      </div>
    </nav>
  )
}
