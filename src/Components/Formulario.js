import React, { useState } from 'react';
import './Formulario.css';

function Formulario() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    mensagem: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Dados do formulário:', formData);
    alert('Formulário enviado com sucesso!');
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      mensagem: ''
    });
  };

  return (
    <div className="formulario-container">
      <h2>Registro de Devolução</h2>
      <form onSubmit={handleSubmit} className="formulario">
        <div className="form-group">
          <label htmlFor="unidade">Unidade:</label>
          <input
            type="text"
            id="unidade"
            name="unidade"
            value={formData.unidade}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="quantidade">Quantidade:</label>
          <input
            type="number"
            id="quantidade"
            name="quantidade"
            value={formData.quantidade}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="chamado">Chamado:</label>
          <input
            type="text"
            id="chamado"
            name="chamado"
            value={formData.chamado}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="observacao">Observação:</label>
          <textarea
            id="observacao"
            name="observacao"
            value={formData.observacao}
            onChange={handleChange}
            rows="4"
            required
          />
        </div>

        <button type="submit" className="submit-button">
          Enviar Formulário
        </button>
      </form>
    </div>
  );
}

export default Formulario;
