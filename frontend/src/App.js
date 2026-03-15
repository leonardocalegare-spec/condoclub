import { useState } from "react";

function App() {

  const [offers, setOffers] = useState([]);

  function carregarOfertas() {
    const lista = [
      { id: 1, nome: "Lavagem Automotiva", preco: 50 },
      { id: 2, nome: "Cesta Orgânica", preco: 80 },
      { id: 3, nome: "Manutenção de Ar Condicionado", preco: 120 }
    ];

    setOffers(lista);
  }

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>

      <h1>CondoClub</h1>

      <h3>Marketplace privado para condomínios</h3>

      <p>
        Plataforma que conecta moradores a fornecedores locais
        com ofertas exclusivas dentro do condomínio.
      </p>

      <button
        onClick={carregarOfertas}
        style={{
          padding: 12,
          fontSize: 16,
          background: "#2c7be5",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer"
        }}
      >
        Ver Ofertas
      </button>

      <div style={{ marginTop: 30 }}>
        {offers.map(oferta => (
          <div key={oferta.id} style={{
            border: "1px solid #ddd",
            padding: 15,
            marginBottom: 10,
            borderRadius: 6
          }}>
            <strong>{oferta.nome}</strong>
            <p>R$ {oferta.preco}</p>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;