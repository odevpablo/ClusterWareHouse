import React, { useState, useEffect } from 'react';
import './Kanban.css';
import config from '../config';
import Dashboard from './Dashboard';

const Kanban = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  const [draggedTask, setDraggedTask] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    imei: '',
    unidade: '',
    prazo: '',
    observacao: '',
    priority: 'media',
    perfil: '',
    numeroChamado: ''
  });
  

  const [editingTask, setEditingTask] = useState(null);
  const [editObservacao, setEditObservacao] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [csvSuccess, setCsvSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);

  const perfis = [
    'Motorista',
    'Promotor',
    'Vendedor',
    'Empregado Geral',
    'KDP',
    'Optimal',
    'ATM',
    'Empregado geral VIP',
    'Empregado geral AD'
  ];

  const columns = [
    { id: 'demanda', title: 'DEMANDA', color: '#9b59b6' },
    { id: 'a-fazer', title: 'A Fazer', color: '#ff6b6b' },
    { id: 'em-andamento', title: 'Em Andamento', color: '#4ecdc4' },
    { id: 'erro', title: 'ERRO', color: '#e74c3c' },
    { id: 'feito', title: 'Feito', color: '#45b7d1' }
  ];

  // Carregar tarefas do backend ao iniciar
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch(config.TAREFAS);
      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }
      const tasksData = await response.json();
      setTasks(tasksData);
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
      setError('Erro ao carregar tarefas do servidor');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    if (draggedTask) {
      try {
        // Atualizar status no backend
        const response = await fetch(`${config.TAREFAS}/${draggedTask.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: columnId,
            observacao: draggedTask.observacao
          })
        });

        if (!response.ok) {
          throw new Error(`Erro ${response.status}`);
        }

        const savedTask = await response.json();
        
        // Enviar webhook para diferentes colunas
        if (columnId === 'a-fazer' && draggedTask.status !== 'a-fazer') {
          sendWebhook(savedTask, 'DEMANDA');
        } else if (columnId === 'em-andamento' && draggedTask.status !== 'em-andamento') {
          sendWebhook(savedTask, 'EM_ANDAMENTO');
        } else if (columnId === 'erro' && draggedTask.status !== 'erro') {
          sendWebhook(savedTask, 'ERRO');
        } else if (columnId === 'feito' && draggedTask.status !== 'feito') {
          sendWebhook(savedTask, 'CONCLUIDO');
        }
        
        // Atualizar estado local
        setTasks(tasks.map(task => 
          task.id === draggedTask.id 
            ? savedTask
            : task
        ));
      } catch (err) {
        console.error('Erro ao atualizar status:', err);
        setError('Erro ao atualizar status da tarefa');
        // Reverter para o status anterior em caso de erro
        return;
      }
      
      setDraggedTask(null);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta': return '#ff4757';
      case 'media': return '#ffa502';
      case 'baixa': return '#2ed573';
      default: return '#747d8c';
    }
  };

  const addTask = async () => {
    if (!newTask.title || !newTask.imei || !newTask.unidade || !newTask.prazo || !newTask.perfil) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(config.TAREFAS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTask.title,
          imei: newTask.imei,
          unidade: newTask.unidade,
          prazo: newTask.prazo,
          perfil: newTask.perfil,
          priority: newTask.priority,
          observacao: newTask.observacao,
          numero_chamado: newTask.numeroChamado,
          status: 'demanda'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Erro ${response.status}`);
      }

      const savedTask = await response.json();
      
      // Adicionar tarefa salva no estado local
      setTasks([...tasks, savedTask]);
      
      // Limpar formulário
      setNewTask({
        title: '',
        imei: '',
        unidade: '',
        prazo: '',
        observacao: '',
        perfil: '',
        numeroChamado: '',
        priority: 'media'
      });
      setShowAddForm(false);
    } catch (err) {
      console.error('Erro ao salvar tarefa:', err);
      setError(err.message || 'Erro ao salvar tarefa');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateObservacao = async (taskId, newObservacao) => {
    try {
      const response = await fetch(`${config.TAREFAS}/${taskId}/observacao`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          observacao: newObservacao
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const updatedTask = await response.json();
      
      // Atualizar estado local
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? updatedTask
          : task
      ));
      
      return updatedTask;
    } catch (err) {
      console.error('Erro ao atualizar observação:', err);
      setError('Erro ao atualizar observação');
      throw err;
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Tem certeza que deseja deletar esta tarefa?')) {
      return;
    }

    try {
      const response = await fetch(`${config.TAREFAS}/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      // Remover tarefa do estado local
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err);
      setError('Erro ao deletar tarefa');
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setCsvError('Selecione um arquivo CSV');
      return;
    }

    // Validação básica do arquivo
    if (!csvFile.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Por favor, selecione um arquivo CSV válido');
      return;
    }

    if (csvFile.size > 5 * 1024 * 1024) { // 5MB
      setCsvError('Arquivo muito grande. Máximo 5MB');
      return;
    }

    setCsvLoading(true);
    setCsvError('');
    setCsvSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      // Debug: log do que está sendo enviado
      console.log('URL do upload:', config.TAREFAS_UPLOAD);
      console.log('Enviando arquivo:', csvFile);
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      const response = await fetch(config.TAREFAS_UPLOAD, {
        method: 'POST',
        // Não enviar headers para FormData - o browser define automaticamente
        body: formData
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        // Tentar parse do erro se for JSON
        try {
          const errorJson = JSON.parse(errorText);
          setCsvError(errorJson.detail || errorText);
        } catch {
          setCsvError(errorText || `Erro ${response.status}`);
        }
        return;
      }

      const uploadedTasks = await response.json();
      console.log('Tasks uploaded:', uploadedTasks);
      
      // Adicionar novas tarefas ao estado local
      setTasks([...tasks, ...uploadedTasks]);
      
      setCsvSuccess(`Importadas ${uploadedTasks.length} tarefas com sucesso!`);
      setCsvFile(null);
      
      // Limpar o input file
      const fileInput = document.getElementById('csv-file-input');
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      console.error('Erro ao fazer upload CSV:', err);
      setCsvError(err.message || 'Erro ao processar arquivo CSV');
    } finally {
      setCsvLoading(false);
    }
  };

  const sendWebhook = async (task, eventType = 'EM_ANDAMENTO') => {
    try {
      let webhookUrl;
      
      // Define URL baseada no tipo de evento
      if (eventType === 'DEMANDA') {
        webhookUrl = 'https://default937793cd67ad44b49c7060dca68e67.67.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/40cdd26a2f8d44ff8b9b3fd44a813490/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=yAhV8BfU_yvr7EzFDqrAVdyZuAqQ-pnYmbvagBjQO0M';
      } else {
        webhookUrl = 'https://default937793cd67ad44b49c7060dca68e67.67.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1207d31af72a40b4a078e5f8b51fb55c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lcDmqh9yyE9b_Arsa_RXqFaLOJ07cqusofLU5DxhPcA';
      }
      
      const payload = {
        event: eventType,
        task: {
          id: task.id,
          title: task.title,
          imei: task.imei,
          unidade: task.unidade,
          prazo: task.prazo,
          observacao: task.observacao,
          perfil: task.perfil,
          numeroChamado: task.numeroChamado,
          priority: task.priority,
          status: task.status,
          timestamp: new Date().toISOString()
        }
      };

      console.log(`🚀 Enviando webhook para ${eventType}`);
      console.log(`📡 URL: ${webhookUrl}`);
      console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log(`📊 Status da resposta: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const responseData = await response.text();
        console.log('✅ Webhook enviado com sucesso!');
        console.log('📄 Resposta do servidor:', responseData);
        console.log('🎯 Evento:', eventType);
        console.log('🆔 ID da tarefa:', task.id);
        console.log('📝 Título:', task.title);
      } else {
        const errorText = await response.text();
        console.error('❌ Erro ao enviar webhook:');
        console.error('📊 Status:', response.status);
        console.error('📄 Resposta de erro:', errorText);
        console.error('🔗 URL utilizada:', webhookUrl);
        console.error('📦 Payload enviado:', JSON.stringify(payload, null, 2));
        
        // Log adicional para debugging
        if (response.status === 401) {
          console.error('🔐 Erro de autenticação - Verifique a assinatura da URL');
        } else if (response.status === 404) {
          console.error('🔍 Endpoint não encontrado - Verifique o workflow ID');
        } else if (response.status === 400) {
          console.error('⚠️ Requisição inválida - Verifique o payload');
        } else if (response.status === 500) {
          console.error('💥 Erro interno do servidor - Problema no Power Automate');
        }
      }
    } catch (error) {
      console.error('💥 Erro de conexão ao enviar webhook:');
      console.error('🔍 Detalhes do erro:', error.message);
    }
  };

  const handleEditObservacao = (task) => {
    setEditingTask(task.id);
    setEditObservacao(task.observacao);
  };

  const saveEditObservacao = async () => {
    if (editingTask) {
      try {
        await updateObservacao(editingTask, editObservacao);
        setEditingTask(null);
        setEditObservacao('');
      } catch (error) {
        // Erro já é tratado na função updateObservacao
      }
    }
  };

  const cancelEditObservacao = () => {
    setEditingTask(null);
    setEditObservacao('');
  };

  const filterTasks = (tasks) => {
    if (!searchTerm.trim()) {
      return tasks;
    }
    
    const searchLower = searchTerm.toLowerCase();
    return tasks.filter(task => 
      (task.title && task.title.toLowerCase().includes(searchLower)) ||
      (task.imei && task.imei.toLowerCase().includes(searchLower)) ||
      (task.unidade && task.unidade.toLowerCase().includes(searchLower)) ||
      ((task.numero_chamado || task.numeroChamado) && (task.numero_chamado || task.numeroChamado).toLowerCase().includes(searchLower)) ||
      (task.perfil && task.perfil.toLowerCase().includes(searchLower)) ||
      (task.observacao && task.observacao.toLowerCase().includes(searchLower))
    );
  };

  const copyToClipboard = async (text, event) => {
    try {
      await navigator.clipboard.writeText(text);
      // Opcional: mostrar feedback visual
      const originalText = event.target.textContent;
      event.target.textContent = '✓ Copiado!';
      event.target.style.color = '#27ae60';
      setTimeout(() => {
        event.target.textContent = originalText;
        event.target.style.color = '';
      }, 2000);
    } catch (err) {
      console.error('Erro ao copiar texto:', err);
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="kanban-container">
      {showDashboard ? (
        <Dashboard onBack={() => setShowDashboard(false)} />
      ) : (
        <>
          <div className="kanban-header">
            <h2>Kanban de Processos</h2>
            <div className="header-actions">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Pesquisar por palavras-chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                {searchTerm && (
                  <button 
                    className="clear-search-btn"
                    onClick={() => setSearchTerm('')}
                    title="Limpar pesquisa"
                  >
                    ×
                  </button>
                )}
              </div>
              <button 
                className="dashboard-btn"
                onClick={() => setShowDashboard(true)}
                title="Ver dashboard de desempenho"
              >
                📊 Dashboard
              </button>
              <button className="add-task-btn" onClick={() => setShowAddForm(true)}>
                + Nova Tarefa
              </button>
            </div>
          </div>

          {/* Mensagens de erro e loading */}
          {error && (
            <div className="error-banner" style={{ 
              backgroundColor: '#e74c3c', 
              color: 'white', 
              padding: '10px', 
              margin: '10px 0', 
              borderRadius: '5px',
              textAlign: 'center'
            }}>
              {error}
              <button 
                onClick={() => setError('')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'white', 
                  marginLeft: '10px', 
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ×
              </button>
            </div>
          )}

          {initialLoading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '200px',
              fontSize: '18px',
              color: '#666'
            }}>
              Carregando tarefas...
            </div>
          ) : (
            <>
            {showAddForm && (
            <div className="add-task-modal">
              <div className="modal-content">
                <h3>Nova Tarefa</h3>
                <div className="form-group">
                  <label>Título:</label>
                  <input
                    type="text"
                    name="title"
                    value={newTask.title}
                    onChange={handleInputChange}
                    placeholder="Digite o título da tarefa"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>IMEI:</label>
                    <input
                      type="text"
                      name="imei"
                      value={newTask.imei}
                      onChange={handleInputChange}
                      placeholder="123456789012345"
                    />
                  </div>
                  <div className="form-group">
                    <label>Unidade:</label>
                    <input
                      type="text"
                      name="unidade"
                      value={newTask.unidade}
                      onChange={handleInputChange}
                      placeholder="UNIDADE-001"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Número do Task:</label>
                    <input
                      type="text"
                      name="numeroChamado"
                      value={newTask.numeroChamado}
                      onChange={handleInputChange}
                      placeholder="CH-000001"
                    />
                  </div>
                  <div className="form-group">
                    <label>Prazo:</label>
                    <input
                      type="date"
                      name="prazo"
                      value={newTask.prazo}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Prioridade:</label>
                    <select
                      name="priority"
                      value={newTask.priority}
                      onChange={handleInputChange}
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Perfil:</label>
                    <select
                      name="perfil"
                      value={newTask.perfil}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Selecione um perfil</option>
                      {perfis.map(perfil => (
                        <option key={perfil} value={perfil}>
                          {perfil}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Observação:</label>
                  <textarea
                    name="observacao"
                    value={newTask.observacao}
                    onChange={handleInputChange}
                    placeholder="Adicione observações..."
                    rows="3"
                  />
                </div>
                
                {/* Seção de Upload CSV */}
                <div className="csv-upload-section" style={{ 
                  borderTop: '1px solid #ddd', 
                  paddingTop: '20px', 
                  marginTop: '20px' 
                }}>
                  <h4 style={{ marginBottom: '15px', color: '#333' }}>
                    📁 Importar Tarefas em Massa (CSV)
                  </h4>
                  
                  <div className="form-group">
                    <label>Selecione o arquivo CSV:</label>
                    <input
                      id="csv-file-input"
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        setCsvFile(e.target.files[0]);
                        setCsvError('');
                        setCsvSuccess('');
                      }}
                      style={{ marginBottom: '10px' }}
                    />
                  </div>
                  
                  {csvFile && (
                    <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                      Arquivo selecionado: <strong>{csvFile.name}</strong>
                    </div>
                  )}
                  
                  {csvError && (
                    <div style={{ 
                      color: '#e74c3c', 
                      marginBottom: '10px', 
                      fontSize: '14px',
                      padding: '8px',
                      backgroundColor: '#ffe6e6',
                      borderRadius: '4px'
                    }}>
                      ⚠️ {csvError}
                    </div>
                  )}
                  
                  {csvSuccess && (
                    <div style={{ 
                      color: '#27ae60', 
                      marginBottom: '10px', 
                      fontSize: '14px',
                      padding: '8px',
                      backgroundColor: '#e8f8f5',
                      borderRadius: '4px'
                    }}>
                      ✅ {csvSuccess}
                    </div>
                  )}
                  
                  <div className="csv-info" style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    marginBottom: '15px',
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px'
                  }}>
                    <strong>Formato esperado do CSV:</strong><br/>
                    Colunas: title, imei, unidade, prazo, perfil, priority, observacao, numero_chamado, status<br/>
                    <strong>Obrigatórios:</strong> title, imei, unidade, prazo, perfil
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <button 
                      onClick={() => {
                        const csvContent = `title,imei,unidade,prazo,perfil,priority,observacao,numero_chamado,status
Instalação Terminal 01,123456789012345,Matriz São Paulo,2024-12-31,tecnico,media,Instalar novo terminal,CH-2024-001,demanda
Manutenção Equipamento,987654321098765,Filial Rio,2024-11-30,tecnico,alta,Manutenção preventiva,CH-2024-002,demanda`;
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = 'exemplo_tarefas.csv';
                        link.click();
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginRight: '10px'
                      }}
                    >
                      📥 Baixar Exemplo CSV
                    </button>
                  </div>
                  
                  <button 
                    className="csv-upload-btn"
                    onClick={handleCsvUpload}
                    disabled={!csvFile || csvLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: csvFile && !csvLoading ? '#27ae60' : '#95a5a6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: csvFile && !csvLoading ? 'pointer' : 'not-allowed',
                      fontSize: '14px'
                    }}
                  >
                    {csvLoading ? 'Importando...' : 'Importar CSV'}
                  </button>
                </div>
                
                <div className="form-actions">
                  {error && (
                    <div className="error-message" style={{ color: '#e74c3c', marginBottom: '10px', fontSize: '14px' }}>
                      {error}
                    </div>
                  )}
                  <button className="cancel-btn" onClick={() => setShowAddForm(false)} disabled={loading}>
                    Cancelar
                  </button>
                  <button className="save-btn" onClick={addTask} disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar Tarefa'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="kanban-board">
            {columns.map(column => (
              <div
                key={column.id}
                className="kanban-column"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="column-header" style={{ backgroundColor: column.color }}>
                  <h3>{column.title}</h3>
                  <span className="task-count">
                    {filterTasks(tasks).filter(task => task.status === column.id).length}
                  </span>
                </div>
                
                <div className="column-content">
                  {filterTasks(tasks)
                    .filter(task => task.status === column.id)
                    .map(task => (
                      <div
                        key={task.id}
                        className="task-card"
                        draggable
                        onDragStart={() => handleDragStart(task)}
                      >
                        <div className="task-header">
                          <span 
                            className="priority-badge"
                            style={{ backgroundColor: getPriorityColor(task.priority) }}
                          >
                            {task.priority.toUpperCase()}
                          </span>
                          <div className="task-actions">
                            {task.status === 'em-andamento' && (
                              <button 
                                className="edit-btn"
                                onClick={() => handleEditObservacao(task)}
                                title="Editar observação"
                              >
                                ✏️
                              </button>
                            )}
                            <button 
                              className="delete-btn"
                              onClick={() => deleteTask(task.id)}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <div className="task-content">
                          <p><strong>{task.title}</strong></p>
                          <div className="task-details">
                            <span 
                              className="detail-item imei-clickable"
                              onClick={(e) => copyToClipboard(task.imei, e)}
                              title="Clique para copiar o IMEI"
                            >
                              📱 {task.imei}
                            </span>
                            <span className="detail-item">🏢 {task.unidade}</span>
                            <span className="detail-item">📞 {task.numero_chamado || task.numeroChamado}</span>
                            <span className="detail-item">👤 {task.perfil}</span>
                            <span className="detail-item">📅 {task.prazo}</span>
                          </div>
                          {task.observacao && (
                            <div className="task-observacao">
                              {editingTask === task.id ? (
                                <div className="edit-observacao">
                                  <textarea
                                    value={editObservacao}
                                    onChange={(e) => setEditObservacao(e.target.value)}
                                    placeholder="Adicione observações..."
                                    rows="3"
                                    autoFocus
                                  />
                                  <div className="edit-actions">
                                    <button className="save-edit-btn" onClick={saveEditObservacao}>
                                      Salvar
                                    </button>
                                    <button className="cancel-edit-btn" onClick={cancelEditObservacao}>
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <small>📝 {task.observacao}</small>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </>
          )}
        </>
      )}
    </div>
  );
};

export default Kanban;
