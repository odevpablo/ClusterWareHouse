import React, { useMemo, useState } from 'react';
import config from '../config';

function CriarEtiqueta() {
  const [imei, setImei] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tocado, setTocado] = useState(false);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState('');
  const [cluster, setCluster] = useState(null);
  const [qrReady, setQrReady] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [qrStamp, setQrStamp] = useState('');
  const [qrSrc, setQrSrc] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvErro, setCsvErro] = useState('');
  const [csvOk, setCsvOk] = useState('');

  const resolveClusterId = (val) => {
    if (!val) return '';
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    if (typeof val === 'object') {
      if (val.id) return resolveClusterId(val.id);
      if (val.cluster_id) return resolveClusterId(val.cluster_id);
    }
    return '';
  };

  const valido = useMemo(() => {
    if (!/^[0-9]{15}$/.test(imei)) return false;
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let digit = parseInt(imei[i], 10);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(imei[14], 10);
  }, [imei]);

  const podeCriar = valido && nome.trim().length > 0 && !criando;

  const handleCriar = async () => {
    if (!podeCriar) return;
    setErro('');
    setCriando(true);
    setCluster(null);
    try {
      const url = `${config.CLUSTERS}/?nome=${encodeURIComponent(nome)}&descricao=${encodeURIComponent(descricao || '')}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify([imei])
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Erro ${resp.status}: ${text || resp.statusText}`);
      }
      const data = await resp.json();
      setCluster(data);
      setQrReady(false);
      setQrError('');
      if (qrSrc) { URL.revokeObjectURL(qrSrc); setQrSrc(''); }
      
    } catch (e) {
      setErro(e.message || 'Erro ao criar cluster');
    } finally {
      setCriando(false);
    }
  };

  const handleGerarQr = async (clusterId) => {
    const id = resolveClusterId(clusterId) || resolveClusterId(cluster);
    if (!id) return;
    try {
      setQrLoading(true);
      setQrError('');
      // Chamada explícita ao endpoint para gerar/obter o QR (com cache-busting)
      const stamp = String(Date.now());
      const url = `${config.CLUSTER_QRCODE(String(id))}?ngrok-skip-browser-warning=true&t=${stamp}`;
      // Log para depuração
      // eslint-disable-next-line no-console
      console.log('Gerar QR GET:', url);
      const res = await fetch(url, {
        method: 'GET',
        headers: { accept: '*/*' },
        cache: 'no-store'
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Erro ao gerar QR (${res.status})`);
      }
      if (qrSrc) { URL.revokeObjectURL(qrSrc); }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setQrSrc(objUrl);
      setQrStamp(stamp);
      setQrReady(true);
    } catch (e) {
      setQrError(e.message || 'Falha ao gerar QR Code');
      setQrReady(false);
    } finally {
      setQrLoading(false);
    }
  };

  const handleBaixarQr = async () => {
    try {
      const id = resolveClusterId(cluster);
      if (!id) return;
      const url = `${config.CLUSTER_QRCODE(String(id))}?ngrok-skip-browser-warning=true&t=${qrStamp || Date.now()}`;
      const fileName = `qr-cluster-${cluster.id}.png`;
      // 1) Se já temos o blob URL (qrSrc), use-o diretamente para baixar (sem CORS)
      if (qrSrc) {
        const a = document.createElement('a');
        a.href = qrSrc;
        a.download = fileName;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      // 2) Fallback: buscar como blob e então baixar
      try {
        const r = await fetch(url, { headers: { accept: '*/*', 'ngrok-skip-browser-warning': 'true' }, cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        const blob = await r.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = fileName;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
        return;
      } catch {}
      // 3) Último recurso: abrir em nova aba (pode não acionar download cross-origin)
      window.open(url, '_blank');
    } catch (e) {
      setQrError(e.message || 'Falha ao baixar QR Code');
    }
  };

  const handleCsvChange = (e) => {
    setCsvOk('');
    setCsvErro('');
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setCsvFile(f);
  };

  const handleProcessarCsv = async () => {
    if (!csvFile || csvLoading) return;
    try {
      setCsvErro('');
      setCsvOk('');
      setCsvLoading(true);
      
      // Criar um objeto com os dados do formulário
      const formData = new FormData();
      formData.append('file', csvFile);
      
      // Criar um objeto com os metadados
      const metadata = {
        criar_cluster_automatico: true,
        nome_cluster: nome || '',
        descricao_cluster: descricao || ''
      };
      
      // Adicionar metadados ao FormData
      formData.append('metadata', JSON.stringify(metadata));
      
      const resp = await fetch(config.PROCESSAR_CSV, {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formData
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Erro ${resp.status}`);
      }
      let msg = 'CSV processado com sucesso';
      try {
        const data = await resp.json();
        if (data && typeof data === 'object') {
          msg = data.mensagem || data.message || msg;
          if (data.cluster_id) {
            setCluster({ id: data.cluster_id, nome: data.cluster_nome || '' });
            // gera o QR automaticamente para o cluster retornado
            try { await handleGerarQr(data.cluster_id); } catch {}
          }
        }
      } catch {}
      setCsvOk(msg);
      setCsvFile(null);
    } catch (e) {
      setCsvErro(e.message || 'Falha ao processar CSV');
    } finally {
      setCsvLoading(false);
    }
  };

  // Removido pré-carregamento do QR: usamos <img src> direto para garantir que o endpoint seja chamado

  return (
    <div className="criar-etiqueta" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h1>Criar Etiqueta por IMEI</h1>
      <div className="form" style={{ display: 'grid', gap: 12 }}>
        <input
          type="text"
          placeholder="Nome do cluster"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="form-control"
          style={{ padding: '10px 12px', fontSize: 16 }}
        />
        <input
          type="text"
          placeholder="Descrição (opcional)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="form-control"
          style={{ padding: '10px 12px', fontSize: 16 }}
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Digite o IMEI (15 dígitos)"
          value={imei}
          onChange={(e) => setImei(e.target.value.replace(/\D/g, ''))}
          onBlur={() => setTocado(true)}
          className="form-control"
          style={{ padding: '10px 12px', fontSize: 16 }}
        />
        {tocado && imei && !valido && (
          <div className="alert alert-warning">IMEI inválido. Verifique os 15 dígitos.</div>
        )}
        {erro && (
          <div className="alert alert-warning">{erro}</div>
        )}
        <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
          <input
            type="file"
            accept=".csv,text/csv,.zip,application/zip"
            onChange={handleCsvChange}
            className="form-control"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleProcessarCsv}
              className={`btn ${csvFile && !csvLoading ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '10px 14px', fontWeight: 600 }}
              disabled={!csvFile || csvLoading || !nome.trim()}
            >
              {csvLoading ? 'Processando CSV...' : 'Processar CSV'}
            </button>
          </div>
          {csvErro && (
            <div className="alert alert-warning">{csvErro}</div>
          )}
          {csvOk && (
            <div className="alert alert-success">{csvOk}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={!podeCriar}
            onClick={handleCriar}
            className={`btn ${podeCriar ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 14px', fontWeight: 600 }}
          >
            {criando ? 'Criando...' : 'Criar Cluster'}
          </button>
          {cluster && (
            <button
              onClick={() => handleGerarQr()}
              className="btn btn-outline-primary"
              style={{ padding: '10px 14px', fontWeight: 600 }}
              disabled={qrLoading}
            >
              {qrLoading ? 'Gerando QR...' : 'Gerar QR Code'}
            </button>
          )}
          {qrLoading && (
            <div style={{ flex: 1, maxWidth: 240 }}>
              <div className="progress">
                <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: '100%' }} />
              </div>
            </div>
          )}
          {cluster && qrReady && !qrLoading && (
            <button
              onClick={handleBaixarQr}
              className="btn btn-outline-secondary"
              style={{ padding: '10px 14px', fontWeight: 600 }}
            >
              Baixar QR Code
            </button>
          )}
        </div>
      </div>
      {qrError && (
        <div className="alert alert-warning" style={{ marginTop: 12 }}>{qrError}</div>
      )}
    </div>
  );
}

export default CriarEtiqueta;
