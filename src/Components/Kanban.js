import React, { useState } from 'react';
import './Kanban.css';
import WebhookStatus from './WebhookStatus';

const Kanban = () => {
  const [tasks, setTasks] = useState([]);

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

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    if (draggedTask) {
      const updatedTask = { ...draggedTask, status: columnId };
      
      // Enviar webhook para diferentes colunas
      if (columnId === 'a-fazer' && draggedTask.status !== 'a-fazer') {
        sendWebhook(updatedTask, 'DEMANDA');
      } else if (columnId === 'em-andamento' && draggedTask.status !== 'em-andamento') {
        sendWebhook(updatedTask, 'EM_ANDAMENTO');
      } else if (columnId === 'erro' && draggedTask.status !== 'erro') {
        sendWebhook(updatedTask, 'ERRO');
      } else if (columnId === 'feito' && draggedTask.status !== 'feito') {
        sendWebhook(updatedTask, 'CONCLUIDO');
      }
      
      setTasks(tasks.map(task => 
        task.id === draggedTask.id 
          ? updatedTask
          : task
      ));
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

  const addTask = () => {
    if (newTask.title && newTask.imei && newTask.unidade && newTask.prazo && newTask.perfil) {
      const task = {
        id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
        title: newTask.title,
        imei: newTask.imei,
        unidade: newTask.unidade,
        prazo: newTask.prazo,
        observacao: newTask.observacao,
        perfil: newTask.perfil,
        numeroChamado: newTask.numeroChamado,
        status: 'demanda',
        priority: newTask.priority
      };
      setTasks([...tasks, task]);
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
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }));
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
      console.error('📍 Stack trace:', error.stack);
      console.error('🌐 Verifique a conexão com a internet e a URL do webhook');
    }
  };

  const deleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const startEditObservacao = (task) => {
    setEditingTask(task.id);
    setEditObservacao(task.observacao);
  };

  const saveEditObservacao = () => {
    if (editingTask) {
      setTasks(tasks.map(task => 
        task.id === editingTask 
          ? { ...task, observacao: editObservacao }
          : task
      ));
      setEditingTask(null);
      setEditObservacao('');
    }
  };

  const cancelEditObservacao = () => {
    setEditingTask(null);
    setEditObservacao('');
  };

  return (
    <div className="kanban-container">
      <div className="kanban-header">
        <h2>Kanban de Processos</h2>
        <button className="add-task-btn" onClick={() => setShowAddForm(true)}>
          + Nova Tarefa
        </button>
      </div>

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
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowAddForm(false)}>
                Cancelar
              </button>
              <button className="save-btn" onClick={addTask}>
                Salvar Tarefa
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
                {tasks.filter(task => task.status === column.id).length}
              </span>
            </div>
            
            <div className="column-content">
              {tasks
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
                            onClick={() => startEditObservacao(task)}
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
                        <span className="detail-item">📱 {task.imei}</span>
                        <span className="detail-item">🏢 {task.unidade}</span>
                        <span className="detail-item">📞 {task.numeroChamado}</span>
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
      
      <WebhookStatus />
    </div>
  );
};

export default Kanban;
