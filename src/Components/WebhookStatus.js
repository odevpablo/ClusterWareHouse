import React, { useState, useEffect } from 'react';
import './WebhookStatus.css';

const WebhookStatus = () => {
  const [webhookLogs, setWebhookLogs] = useState([]);

  useEffect(() => {
    // Interceptar logs do console para capturar eventos de webhook
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      if (args[0] === 'Webhook enviado com sucesso:') {
        setWebhookLogs(prev => [{
          id: Date.now(),
          type: 'success',
          message: 'Webhook enviado com sucesso',
          data: args[1],
          timestamp: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 5)); // Manter apenas os 5 mais recentes
      }
      originalLog(...args);
    };
    
    console.error = (...args) => {
      if (args[0] === 'Erro ao enviar webhook:') {
        setWebhookLogs(prev => [{
          id: Date.now(),
          type: 'error',
          message: 'Erro ao enviar webhook',
          data: args[1],
          timestamp: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 5));
      }
      originalError(...args);
    };
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const clearLogs = () => {
    setWebhookLogs([]);
  };

  return (
    <div className="webhook-status">
      <div className="webhook-header">
        <h4>Status do Webhook</h4>
        <button className="clear-btn" onClick={clearLogs}>
          Limpar
        </button>
      </div>
      <div className="webhook-logs">
        {webhookLogs.length === 0 ? (
          <p className="no-logs">Nenhuma atividade recente</p>
        ) : (
          webhookLogs.map(log => (
            <div key={log.id} className={`log-item ${log.type}`}>
              <div className="log-header">
                <span className="log-time">{log.timestamp}</span>
                <span className={`log-status ${log.type}`}>
                  {log.type === 'success' ? '✓' : '✗'}
                </span>
              </div>
              <div className="log-message">{log.message}</div>
              {log.data && (
                <details className="log-details">
                  <summary>Dados enviados</summary>
                  <pre>{JSON.stringify(log.data, null, 2)}</pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WebhookStatus;
