import React from 'react'
import { Link } from 'react-router-dom'

const styles = {
  container: { fontFamily: 'system-ui, sans-serif', color: '#1a1a2e' },
  hero: {
    background: 'linear-gradient(135deg, #1a56db 0%, #0f3460 100%)',
    color: '#fff',
    padding: '80px 24px',
    textAlign: 'center',
  },
  heroTitle: { fontSize: '2.8rem', fontWeight: 800, margin: '0 0 16px' },
  heroSub: { fontSize: '1.3rem', margin: '0 0 32px', opacity: 0.9 },
  heroDesc: { fontSize: '1rem', maxWidth: '600px', margin: '0 auto 40px', opacity: 0.8, lineHeight: 1.6 },
  ctaRow: { display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' },
  btnPrimary: {
    background: '#fff',
    color: '#1a56db',
    padding: '14px 32px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '1rem',
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  btnSecondary: {
    background: 'transparent',
    color: '#fff',
    padding: '14px 32px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '1rem',
    textDecoration: 'none',
    border: '2px solid rgba(255,255,255,0.7)',
  },
  features: { padding: '60px 24px', background: '#f8faff', textAlign: 'center' },
  featTitle: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '40px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  featureCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '32px 24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  },
  icon: { fontSize: '2.5rem', marginBottom: '16px' },
  featureName: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '10px' },
  featureDesc: { fontSize: '0.9rem', color: '#555', lineHeight: 1.6 },
}

const features = [
  {
    icon: '🛠️',
    name: 'Serviços Exclusivos',
    desc: 'Acesse uma curadoria de serviços negociados especialmente para o seu condomínio com condições diferenciadas.',
  },
  {
    icon: '⚡',
    name: 'Praticidade',
    desc: 'Contrate serviços em poucos cliques, acompanhe seus pedidos em tempo real e receba no seu condomínio.',
  },
  {
    icon: '🔒',
    name: 'Segurança',
    desc: 'Todos os fornecedores são verificados e avaliados. Pagamentos protegidos com criptografia de ponta.',
  },
]

export default function HomePage() {
  return (
    <div style={styles.container}>
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>Bem-vindo ao CondoClub</h1>
        <p style={styles.heroSub}>O marketplace do seu condomínio</p>
        <p style={styles.heroDesc}>
          Conectamos moradores de condomínios a fornecedores de serviços de qualidade. 
          Economize tempo e dinheiro contratando serviços exclusivos diretamente pelo app.
        </p>
        <div style={styles.ctaRow}>
          <Link to="/register" style={styles.btnPrimary}>Cadastrar</Link>
          <Link to="/services" style={styles.btnSecondary}>Ver Serviços</Link>
        </div>
      </section>

      <section style={styles.features}>
        <h2 style={styles.featTitle}>Por que escolher o CondoClub?</h2>
        <div style={styles.grid}>
          {features.map((f) => (
            <div key={f.name} style={styles.featureCard}>
              <div style={styles.icon}>{f.icon}</div>
              <h3 style={styles.featureName}>{f.name}</h3>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
