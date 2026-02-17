import React, { useState } from 'react';
import './App.css';
import Consultar from './Components/Consultar';
import CriarEtiqueta from './Components/CriarEtiqueta';

function App() {
  const [view, setView] = useState('');
  return (
    <div className="app">
      <header className="app-header">
        <h1>Warehouse Simpress</h1>
      </header>
      <main className="app-content">
        {!view ? (
          <section className="hero">
            <h2>Bem-vindo ao Warehouse Simpress</h2>
            <p>Selecione uma opção abaixo:</p>
            <div className="button-group">
              <button 
                className="action-button create-button"
                onClick={() => setView('criar')}
              >
                Criar Etiqueta
              </button>
              <button 
                className="action-button query-button"
                onClick={() => setView('consultar')}
              >
                Consultar
              </button>
            </div>
          </section>
        ) : view === 'criar' ? (
          <>
            <button className="back-button" onClick={() => setView('')}>
              &larr; Voltar
            </button>
            <CriarEtiqueta />
          </>
        ) : (
          <>
            <button className="back-button" onClick={() => setView('')}>
              &larr; Voltar
            </button>
            <Consultar />
          </>
        )}
      </main>
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} odevpablo. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default App;
