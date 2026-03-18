import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import config from '../config';

const Dashboard = ({ onBack }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');

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
    if (!task.prazo || task.status === 'feito') return false;
    return new Date(task.prazo) < new Date();
  }).length;

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
            ← Voltar
          </button>
          <h1>📊 Dashboard de Desempenho</h1>
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
            🔄 Atualizar
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
          <div className="metric-icon">📋</div>
          <div className="metric-content">
            <h3>{totalTasks}</h3>
            <p>Total de Tarefas</p>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>{tasksByStatus.feito}</h3>
            <p>Concluídas</p>
            <span className="metric-rate">{completionRate}%</span>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-icon">⏳</div>
          <div className="metric-content">
            <h3>{tasksByStatus['em-andamento']}</h3>
            <p>Em Andamento</p>
          </div>
        </div>

        <div className="metric-card danger">
          <div className="metric-icon">⚠️</div>
          <div className="metric-content">
            <h3>{overdueTasks}</h3>
            <p>Atrasadas</p>
          </div>
        </div>
      </div>

      {/* Gráficos e estatísticas */}
      <div className="charts-grid">
        {/* Status Distribution */}
        <div className="chart-card">
          <h3>📊 Distribuição por Status</h3>
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
          <h3>🎯 Distribuição por Prioridade</h3>
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

      {/* Top Rankings */}
      <div className="rankings-grid">
        {/* Top Perfis */}
        <div className="ranking-card">
          <h3>👥 Top Perfis</h3>
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
          <h3>🏢 Top Unidades</h3>
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
        <h3>📈 Resumo de Desempenho</h3>
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
    </div>
  );
};

export default Dashboard;
