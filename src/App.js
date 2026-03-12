import React, { useState } from 'react';
import './App.css';
import logo from './assets/Logos-Simpress_Prancheta-1-a806a282.webp';
import Consultar from './Components/Consultar';
import CriarEtiqueta from './Components/CriarEtiqueta';
import Formulario from './Components/Formulario';
import Kanban from './Components/Kanban';

function App() {
  const [view, setView] = useState('');
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          {view && (
            <button className="back-button" onClick={() => setView('')}>
              <span>&larr; Voltar</span>
            </button>
          )}
          <img src={logo} alt="Simpress Logo" className="app-logo" />
        </div>
      </header>
      <main className="app-content">
        {!view ? (
          <section className="hero">
            <h2>Operacional / Administração</h2>
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
              <button 
                className="action-button form-button"
                onClick={() => setView('formulario')}
              >
                Formulário
              </button>
              <button 
                className="action-button kanban-button"
                onClick={() => setView('kanban')}
              >
                Kanban
              </button>
            </div>
          </section>
        ) : view === 'criar' ? (
          <CriarEtiqueta />
        ) : view === 'formulario' ? (
          <Formulario />
        ) : view === 'kanban' ? (
          <Kanban />
        ) : (
          <Consultar />
        )}
      </main>
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} odevpablo. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default App;
