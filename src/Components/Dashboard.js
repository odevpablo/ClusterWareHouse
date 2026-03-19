import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import config from '../config';

const Dashboard = ({ onBack }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [showOverdueModal, setShowOverdueModal] = useState(false);

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
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTasks = () => {
    if (selectedPeriod === 'all') return tasks;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (selectedPeriod) {
      case '7days':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        filterDate.setDate(now.getDate() - 30);
        break;
      case 'today':
        filterDate.setHours(0, 0, 0, 0);
        break;
      default:
        return tasks;
    }
    
    return tasks.filter(task => {
      const taskDate = new Date(task.data_criacao || task.prazo);
      return taskDate >= filterDate;
    });
  };

  const filteredTasks = getFilteredTasks();

  // Estatísticas básicas
  const totalTasks = filteredTasks.length;
  const tasksByStatus = {
    demanda: filteredTasks.filter(t => t.status === 'demanda').length,
    'a-fazer': filteredTasks.filter(t => t.status === 'a-fazer').length,
    'em-andamento': filteredTasks.filter(t => t.status === 'em-andamento').length,
    erro: filteredTasks.filter(t => t.status === 'erro').length,
    feito: filteredTasks.filter(t => t.status === 'feito').length,
  };

  const tasksByPriority = {
    alta: filteredTasks.filter(t => t.priority === 'alta').length,
    media: filteredTasks.filter(t => t.priority === 'media').length,
    baixa: filteredTasks.filter(t => t.priority === 'baixa').length,
  };

  // Taxa de conclusão
  const completionRate = totalTasks > 0 ? Math.round((tasksByStatus.feito / totalTasks) * 100) : 0;

  // Tarefas atrasadas
  const overdueTasks = filteredTasks.filter(task => {
    if (!task.prazo || task.status === 'feito' || task.status === 'erro') return false;
    return new Date(task.prazo) < new Date();
  });

  // Agrupar tarefas atrasadas por título/indicador
  const getOverdueTasksByTitle = () => {
    const grouped = {};
    overdueTasks.forEach(task => {
      const title = task.title || 'Sem Título';
      if (!grouped[title]) {
        grouped[title] = [];
      }
      grouped[title].push(task);
    });
    return grouped;
  };

  // Top perfis
  const topPerfis = {};
  filteredTasks.forEach(task => {
    if (task.perfil) {
      topPerfis[task.perfil] = (topPerfis[task.perfil] || 0) + 1;
    }
  });

  const sortedPerfis = Object.entries(topPerfis)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Top unidades
  const topUnidades = {};
  filteredTasks.forEach(task => {
    if (task.unidade) {
      topUnidades[task.unidade] = (topUnidades[task.unidade] || 0) + 1;
    }
  });

  const sortedUnidades = Object.entries(topUnidades)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Estatística de tempo de trabalho (40 minutos por configuração)
  const getWorkTimeStats = () => {
    // Considerar tarefas que parecem ser configurações baseadas no título
    const configurationTasks = filteredTasks.filter(task => {
      if (!task.title) return false;
      const title = task.title.toLowerCase();
      return title.includes('configuração') || 
             title.includes('configuracao') || 
             title.includes('instalação') || 
             title.includes('instalacao') ||
             title.includes('setup') ||
             title.includes('setup inicial') ||
             title.includes('configurar');
    });

    const totalConfigurations = configurationTasks.length;
    const totalMinutes = totalConfigurations * 40;
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    // Por status
    const configByStatus = {
      demanda: configurationTasks.filter(t => t.status === 'demanda').length,
      'a-fazer': configurationTasks.filter(t => t.status === 'a-fazer').length,
      'em-andamento': configurationTasks.filter(t => t.status === 'em-andamento').length,
      feito: configurationTasks.filter(t => t.status === 'feito').length,
      erro: configurationTasks.filter(t => t.status === 'erro').length,
    };

    const completedConfigurations = configByStatus.feito;
    const completedMinutes = completedConfigurations * 40;
    const completedHours = Math.floor(completedMinutes / 60);
    const completedRemainingMinutes = completedMinutes % 60;

    return {
      totalConfigurations,
      totalHours,
      totalMinutes,
      remainingMinutes,
      formattedTotal: totalHours > 0 ? `${totalHours}h ${remainingMinutes}min` : `${totalMinutes}min`,
      completedConfigurations,
      completedHours,
      completedMinutes,
      completedRemainingMinutes,
      formattedCompleted: completedHours > 0 ? `${completedHours}h ${completedRemainingMinutes}min` : `${completedMinutes}min`,
      pendingMinutes: (totalConfigurations - completedConfigurations) * 40,
      configByStatus
    };
  };

  const workTimeStats = getWorkTimeStats();

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <button className="back-btn" onClick={onBack}>
            ← KANBAN
          </button>
          <h1>Dashboard de Desempenho</h1>
        </div>
        <div className="header-controls">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-selector"
          >
            <option value="all">Todo o período</option>
            <option value="30days">Últimos 30 dias</option>
            <option value="7days">Últimos 7 dias</option>
            <option value="today">Hoje</option>
          </select>
          <button className="refresh-btn" onClick={loadTasks}>
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Cards principais */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-icon">T</div>
          <div className="metric-content">
            <h3>{totalTasks}</h3>
            <p>Total de Tarefas</p>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon">C</div>
          <div className="metric-content">
            <h3>{tasksByStatus.feito}</h3>
            <p>Concluídas</p>
            <span className="metric-rate">{completionRate}%</span>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-icon">E</div>
          <div className="metric-content">
            <h3>{tasksByStatus['em-andamento']}</h3>
            <p>Em Andamento</p>
          </div>
        </div>

        <div className="metric-card danger" onClick={() => setShowOverdueModal(true)} style={{ cursor: 'pointer' }}>
          <div className="metric-icon">A</div>
          <div className="metric-content">
            <h3>{overdueTasks.length}</h3>
            <p>Atrasadas</p>
          </div>
        </div>
      </div>

      {/* Gráficos e estatísticas */}
      <div className="charts-grid">
        {/* Status Distribution */}
        <div className="chart-card">
          <h3>Distribuição por Status</h3>
          <div className="status-chart">
            {Object.entries(tasksByStatus).map(([status, count]) => {
              const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
              const colors = {
                demanda: '#9b59b6',
                'a-fazer': '#ff6b6b',
                'em-andamento': '#4ecdc4',
                erro: '#e74c3c',
                feito: '#45b7d1'
              };
              
              return (
                <div key={status} className="status-item">
                  <div className="status-bar">
                    <div 
                      className="status-fill" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: colors[status]
                      }}
                    ></div>
                  </div>
                  <div className="status-info">
                    <span className="status-label">{status.replace('-', ' ')}</span>
                    <span className="status-count">{count} ({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="chart-card">
          <h3>Distribuição por Prioridade</h3>
          <div className="priority-chart">
            {Object.entries(tasksByPriority).map(([priority, count]) => {
              const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
              const colors = {
                alta: '#e74c3c',
                media: '#f39c12',
                baixa: '#27ae60'
              };
              
              return (
                <div key={priority} className="priority-item">
                  <div className="priority-bar">
                    <div 
                      className="priority-fill" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: colors[priority]
                      }}
                    ></div>
                  </div>
                  <div className="priority-info">
                    <span className="priority-label">{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
                    <span className="priority-count">{count} ({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gráfico de Colunas - Métricas Relevantes */}
      <div className="charts-grid">
        <div className="chart-card full-width">
          <h3>Métricas de Desempenho</h3>
          <div className="bar-chart">
            <div className="chart-container">
              <div className="chart-bars">
                {/* Taxa de Conclusão */}
                <div className="bar-group">
                  <div className="bar-wrapper">
                    <div 
                      className="bar completion-bar"
                      style={{ height: `${completionRate}%` }}
                    >
                      <span className="bar-value">{completionRate}%</span>
                    </div>
                  </div>
                  <span className="bar-label">Taxa de Conclusão</span>
                </div>

                {/* Tarefas em Andamento */}
                <div className="bar-group">
                  <div className="bar-wrapper">
                    <div 
                      className="bar progress-bar"
                      style={{ height: `${totalTasks > 0 ? Math.round((tasksByStatus['em-andamento'] / totalTasks) * 100) : 0}%` }}
                    >
                      <span className="bar-value">{tasksByStatus['em-andamento']}</span>
                    </div>
                  </div>
                  <span className="bar-label">Em Andamento</span>
                </div>

                {/* Tarefas Atrasadas */}
                <div className="bar-group">
                  <div className="bar-wrapper">
                    <div 
                      className="bar overdue-bar"
                      style={{ height: `${totalTasks > 0 ? Math.round((overdueTasks.length / totalTasks) * 100) : 0}%` }}
                    >
                      <span className="bar-value">{overdueTasks.length}</span>
                    </div>
                  </div>
                  <span className="bar-label">Atrasadas</span>
                </div>

                {/* Tarefas com Erro */}
                <div className="bar-group">
                  <div className="bar-wrapper">
                    <div 
                      className="bar error-bar"
                      style={{ height: `${totalTasks > 0 ? Math.round((tasksByStatus.erro / totalTasks) * 100) : 0}%` }}
                    >
                      <span className="bar-value">{tasksByStatus.erro}</span>
                    </div>
                  </div>
                  <span className="bar-label">Com Erro</span>
                </div>

                {/* Prioridades Altas */}
                <div className="bar-group">
                  <div className="bar-wrapper">
                    <div 
                      className="bar high-priority-bar"
                      style={{ height: `${totalTasks > 0 ? Math.round((tasksByPriority.alta / totalTasks) * 100) : 0}%` }}
                    >
                      <span className="bar-value">{tasksByPriority.alta}</span>
                    </div>
                  </div>
                  <span className="bar-label">Prioridade Alta</span>
                </div>

                {/* Tempo de Configuração */}
                <div className="bar-group">
                  <div className="bar-wrapper">
                    <div 
                      className="bar time-bar"
                      style={{ height: `${Math.min(workTimeStats.totalHours * 2, 100)}%` }}
                    >
                      <span className="bar-value">{workTimeStats.formattedTotal}</span>
                    </div>
                  </div>
                  <span className="bar-label">Tempo Config</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Rankings */}
      <div className="rankings-grid">
        {/* Top Perfis */}
        <div className="ranking-card">
          <h3>Top Perfis</h3>
          <div className="ranking-list">
            {sortedPerfis.length > 0 ? (
              sortedPerfis.map(([perfil, count], index) => (
                <div key={perfil} className="ranking-item">
                  <span className="ranking-position">#{index + 1}</span>
                  <span className="ranking-name">{perfil}</span>
                  <span className="ranking-count">{count} tarefas</span>
                </div>
              ))
            ) : (
              <p className="no-data">Nenhum dado disponível</p>
            )}
          </div>
        </div>

        {/* Top Unidades */}
        <div className="ranking-card">
          <h3>Top Unidades</h3>
          <div className="ranking-list">
            {sortedUnidades.length > 0 ? (
              sortedUnidades.map(([unidade, count], index) => (
                <div key={unidade} className="ranking-item">
                  <span className="ranking-position">#{index + 1}</span>
                  <span className="ranking-name">{unidade}</span>
                  <span className="ranking-count">{count} tarefas</span>
                </div>
              ))
            ) : (
              <p className="no-data">Nenhum dado disponível</p>
            )}
          </div>
        </div>
      </div>

      {/* Resumo Detalhado */}
      <div className="summary-card">
        <h3>Resumo de Desempenho</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <label>Taxa de Conclusão:</label>
            <span className={`value ${completionRate >= 70 ? 'good' : completionRate >= 50 ? 'medium' : 'bad'}`}>
              {completionRate}%
            </span>
          </div>
          <div className="summary-item">
            <label>Tarefas em Demanda:</label>
            <span className="value">{tasksByStatus.demanda}</span>
          </div>
          <div className="summary-item">
            <label>Tarefas com Erro:</label>
            <span className="value">{tasksByStatus.erro}</span>
          </div>
          <div className="summary-item">
            <label>Prioridades Altas:</label>
            <span className="value">{tasksByPriority.alta}</span>
          </div>
        </div>
      </div>

      {/* Estatísticas de Tempo de Configuração */}
      <div className="summary-card">
        <h3>Estatísticas de Tempo de Configuração</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <label>Total de Configurações:</label>
            <span className="value">{workTimeStats.totalConfigurations}</span>
          </div>
          <div className="summary-item">
            <label>Tempo Total Estimado:</label>
            <span className="value">{workTimeStats.formattedTotal}</span>
          </div>
          <div className="summary-item">
            <label>Tempo Concluído:</label>
            <span className="value good">{workTimeStats.formattedCompleted}</span>
          </div>
          <div className="summary-item">
            <label>Tempo Pendente:</label>
            <span className="value bad">{Math.floor(workTimeStats.pendingMinutes / 60)}h {workTimeStats.pendingMinutes % 60}min</span>
          </div>
        </div>
        
        <div className="time-progress">
          <div className="progress-label">
            <span>Progresso do Tempo</span>
            <span>{workTimeStats.completedConfigurations}/{workTimeStats.totalConfigurations} configs</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${workTimeStats.totalConfigurations > 0 ? (workTimeStats.completedConfigurations / workTimeStats.totalConfigurations) * 100 : 0}%` 
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Modal de Tarefas Atrasadas por Indicador */}
      {showOverdueModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Tarefas Atrasadas por Indicador</h2>
              <button className="close-btn" onClick={() => setShowOverdueModal(false)}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {Object.entries(getOverdueTasksByTitle()).length > 0 ? (
                Object.entries(getOverdueTasksByTitle()).map(([title, tasks]) => (
                  <div key={title} className="indicator-group">
                    <h3 className="indicator-title">
                      {title} ({tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'})
                    </h3>
                    <div className="tasks-list">
                      {tasks.map(task => (
                        <div key={task.id} className="overdue-task-item">
                          <div className="task-info">
                            <span className="task-imei">{task.imei}</span>
                            <span className="task-unidade">{task.unidade}</span>
                            <span className="task-perfil">{task.perfil}</span>
                            <span className="task-prazo">{task.prazo}</span>
                            <span className="task-priority priority-badge" style={{ 
                              backgroundColor: task.priority === 'alta' ? '#e74c3c' : 
                                               task.priority === 'media' ? '#f39c12' : '#27ae60'
                            }}>
                              {task.priority.toUpperCase()}
                            </span>
                          </div>
                          {task.numero_chamado && (
                            <span className="task-chamado">{task.numero_chamado}</span>
                          )}
                          {task.observacao && (
                            <p className="task-observacao">{task.observacao}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-overdue-tasks">
                  <p>Nenhuma tarefa atrasada encontrada!</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="close-modal-btn" onClick={() => setShowOverdueModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
