import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import './Consultar.css';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import config from '../config';

// Configuração do scanner
const qrConfig = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  disableFlip: false,
  experimentalFeatures: { useBarCodeDetectorIfSupported: true },
  formatsToSupport: [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.EAN_13,
  ],
};

function Consultar() {
  const [consulta, setConsulta] = useState('');
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erroCamera, setErroCamera] = useState('');
  const [mensagemStatus, setMensagemStatus] = useState('');
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [iniciando, setIniciando] = useState(false);

  const [modeloSelecionado, setModeloSelecionado] = useState(null);
  const [imeisFiltrados, setImeisFiltrados] = useState([]);

  const detalhesArray = Object.values(resultado?.detalhes_imeis || {});
  const imeisLista = detalhesArray.map((d) => d?.imei).filter(Boolean);

  const resumoPorStatus = detalhesArray.reduce((acc, d) => {
    const key = d?.status || 'SEM_STATUS';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const resumoPorModelo = detalhesArray.reduce((acc, d) => {
    const key = d?.modelo || 'SEM_MODELO';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const detalhesFiltrados = useMemo(() => {
    if (!modeloSelecionado) return detalhesArray;
    return detalhesArray.filter((d) => (d?.modelo || 'SEM_MODELO') === modeloSelecionado);
  }, [detalhesArray, modeloSelecionado]);

  const escapeCsv = (value) => {
    const raw = value === null || value === undefined ? '' : String(value);
    const escaped = raw.replace(/"/g, '""');
    return /[\n\r,;"]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const baixarCsvImeis = () => {
    if (!resultado) return;

    const header = ['IMEI', 'Modelo', 'Status', 'Fabricante'];
    const lines = [header.join(';')];

    detalhesArray.forEach((d) => {
      lines.push(
        [
          escapeCsv(d?.imei),
          escapeCsv(d?.modelo),
          escapeCsv(d?.status),
          escapeCsv(d?.fabricante),
        ].join(';')
      );
    });

    const csv = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const nomeBase = String(resultado?.nome || resultado?.id || 'imeis')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .trim();
    a.download = `${nomeBase || 'imeis'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const html5QrCodeRef = useRef(null);
  const scannerRef = useRef(null);

  // =============================
  // PARAR CÂMERA
  // =============================
  const pararCamera = useCallback(async () => {
    if (!html5QrCodeRef.current) return;

    try {
      await html5QrCodeRef.current.stop();
    } catch (err) {
      console.warn('Erro ao parar câmera:', err);
    } finally {
      html5QrCodeRef.current = null;
      setCameraAtiva(false);
    }
  }, []);

  // =============================
  // BUSCAR PRODUTO
  // =============================
  const buscarProduto = useCallback(async (clusterData) => {
    if (!clusterData?.trim()) {
      throw new Error('Nenhum dado fornecido para busca');
    }

    try {
      setCarregando(true);
      setResultado(null);
      setErroCamera('');
      setMensagemStatus('Buscando informações...');

      let clusterId;

      const urlMatch = clusterData.match(/clusters\/([^/]+)\/?/);
      if (urlMatch && urlMatch[1]) {
        clusterId = urlMatch[1];
      } else {
        try {
          const parsed =
            typeof clusterData === 'string'
              ? JSON.parse(clusterData)
              : clusterData;

          clusterId = parsed.id || parsed.cluster_id || parsed;
        } catch {
          clusterId = clusterData;
        }
      }

      const idLimpo = String(clusterId).trim();
      if (!idLimpo) throw new Error('ID do cluster inválido.');

      const url = `${config.API_BASE_URL}/api/clusters/${encodeURIComponent(idLimpo)}`;
      // eslint-disable-next-line no-console
      console.log('Consultar: GET', url);

      let response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Consultar: falha no fetch', e);
        throw new Error('Falha de rede ao chamar a API. Verifique REACT_APP_API_URL.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          `Erro ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const dados = await response.json();

      const resultadoFormatado = {
        ...dados,
        id: dados.id || idLimpo,
        nome:
          dados.nome ||
          dados.cluster_nome ||
          `Cluster ${idLimpo}`,
        descricao: dados.descricao || '',
        total_imeis:
          dados.total_imeis ||
          (dados.detalhes_imeis
            ? Object.keys(dados.detalhes_imeis).length
            : 0),
        detalhes_imeis: dados.detalhes_imeis || {},
      };

      setResultado(resultadoFormatado);
      setModeloSelecionado(null);
      setImeisFiltrados([]);

      return resultadoFormatado;
    } catch (error) {
      setErroCamera(
        `Erro ao buscar informações: ${error.message}`
      );
      throw error;
    } finally {
      setCarregando(false);
      setMensagemStatus('');
    }
  }, []);

  // =============================
  // SUCESSO NA LEITURA
  // =============================
  const onQRCodeSuccess = useCallback(
    async (decodedText) => {
      setConsulta(decodedText);

      try {
        await buscarProduto(decodedText);
        await pararCamera();
      } catch (error) {
        setErroCamera(error.message);
      }
    },
    [buscarProduto, pararCamera]
  );

  // =============================
  // INICIAR CÂMERA
  // =============================
  const iniciarCamera = useCallback(async () => {
    if (iniciando || cameraAtiva) return;

    setIniciando(true);
    setErroCamera('');

    try {
      const qrCode = new Html5Qrcode('scanner');
      html5QrCodeRef.current = qrCode;

      await qrCode.start(
        { facingMode: 'environment' },
        qrConfig,
        onQRCodeSuccess
      );

      setCameraAtiva(true);
    } catch (error) {
      setErroCamera(
        'Não foi possível acessar a câmera. Verifique as permissões.'
      );
    } finally {
      setIniciando(false);
    }
  }, [cameraAtiva, iniciando, onQRCodeSuccess]);

  // =============================
  // LIMPEZA AO DESMONTAR
  // =============================
  useEffect(() => {
    return () => {
      pararCamera();
    };
  }, [pararCamera]);

  useEffect(() => {
    setImeisFiltrados(detalhesFiltrados.map((d) => d?.imei).filter(Boolean));
  }, [detalhesFiltrados]);

  const onConsultar = useCallback(async () => {
    try {
      await buscarProduto(consulta);
    } catch (error) {
      setErroCamera(error.message);
    }
  }, [buscarProduto, consulta]);

  const onLimpar = useCallback(async () => {
    setConsulta('');
    setResultado(null);
    setErroCamera('');
    setMensagemStatus('');
    setModeloSelecionado(null);
    setImeisFiltrados([]);
    await pararCamera();
  }, [pararCamera]);

  // =============================
  // RENDER
  // =============================
  return (
    <div className="consultar-container">
      <div className="consultar-header">
        <div className="consultar-header__title">
          <h1>Consultar</h1>
          <div className="consultar-subtitle">
            Digite um ID/URL do cluster ou use o scanner para preencher automaticamente.
          </div>
        </div>
      </div>

      <div className="consultar-card">
        <div className="consultar-form">
          <div className="consultar-actions">
            <button
              type="button"
              onClick={cameraAtiva ? pararCamera : iniciarCamera}
              className={`action-button query-button consultar-actionButton ${
                cameraAtiva ? 'consultar-actionButton--danger' : ''
              }`}
              disabled={iniciando || carregando}
            >
              {cameraAtiva ? 'FECHAR CÂMERA' : 'ABRIR CÂMERA'}
            </button>

            <button
              type="button"
              className="action-button query-button consultar-actionButton consultar-actionButton--ghost"
              onClick={onLimpar}
              disabled={carregando || iniciando}
            >
              Limpar
            </button>

            <button
              type="button"
              className="action-button query-button consultar-actionButton"
              onClick={onConsultar}
              disabled={carregando || iniciando || !consulta.trim()}
              title="Repetir consulta com o último código lido"
            >
              Consultar
            </button>
          </div>

          <div className="consultar-last">
            <div className="consultar-lastLabel">Último código lido</div>
            <div className="consultar-lastValue consultar-mono">
              {consulta?.trim() ? consulta : '-'}
            </div>
          </div>

          {!!mensagemStatus && !carregando && (
            <div className="consultar-status" role="status">
              {mensagemStatus}
            </div>
          )}

          {erroCamera && (
            <div className="alert alert-warning mt-3">{erroCamera}</div>
          )}
        </div>

        <div className="consultar-scannerWrap">
          <div
            id="scanner"
            ref={scannerRef}
            className={`consultar-scanner ${cameraAtiva || iniciando ? 'is-visible' : ''}`}
          />
          {(cameraAtiva || iniciando) && (
            <div className="consultar-scannerHint">
              Aponte a câmera para o QR Code / código de barras.
            </div>
          )}
        </div>
      </div>

      {carregando && (
        <div className="consultar-loading">
          <div className="spinner-border text-primary" role="status" />
          <div className="consultar-loadingText">Buscando informações...</div>
        </div>
      )}

      {resultado && (
        <div className="consultar-result">
          <div className="card mt-4">
            <div className="card-body">
              <div className="consultar-resultHeader">
                <div>
                  <h3 className="consultar-resultTitle">{resultado.nome}</h3>
                  {!!resultado.descricao && (
                    <div className="text-muted">{resultado.descricao}</div>
                  )}
                  <div className="consultar-resultMeta">
                    ID: <strong>{resultado.id}</strong>
                  </div>
                </div>

                {imeisLista.length > 0 && (
                  <div className="consultar-resultHeaderActions">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={baixarCsvImeis}
                    >
                      Baixar CSV
                    </button>
                  </div>
                )}
              </div>

              <div className="consultar-kpis">
                <div className="consultar-kpi">
                  <div className="consultar-kpiLabel">Total de IMEIs</div>
                  <div className="consultar-kpiValue">{resultado.total_imeis}</div>
                </div>
                <div className="consultar-kpi">
                  <div className="consultar-kpiLabel">Itens exibidos</div>
                  <div className="consultar-kpiValue">{detalhesFiltrados.length}</div>
                </div>
              </div>

              {imeisLista.length > 0 && (
                <div className="consultar-panels">
                  <div className="consultar-panel">
                    <div className="consultar-panelTitle">Resumo por Status</div>
                    {Object.keys(resumoPorStatus).length === 0 ? (
                      <div className="text-muted">Sem dados de status.</div>
                    ) : (
                      <div className="consultar-chips">
                        {Object.entries(resumoPorStatus)
                          .sort((a, b) => b[1] - a[1])
                          .map(([status, qtd]) => (
                            <span key={status} className="consultar-chip">
                              <strong>{status}</strong>
                              <span className="consultar-chipCount">{qtd}</span>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="consultar-panel">
                    <div className="consultar-panelTitle">Resumo por Modelo</div>
                    {Object.keys(resumoPorModelo).length === 0 ? (
                      <div className="text-muted">Sem dados de modelo.</div>
                    ) : (
                      <div className="consultar-chips">
                        {Object.entries(resumoPorModelo)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 12)
                          .map(([modelo, qtd]) => (
                            <span key={modelo} className="consultar-chip">
                              <strong>{modelo}</strong>
                              <span className="consultar-chipCount">{qtd}</span>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {imeisLista.length > 0 && (
                <div className="lista-imeis mt-4">
                  <div className="consultar-tableHeader">
                    <h4>Detalhes dos IMEIs</h4>

                    <div className="consultar-tableTools">
                      <select
                        className="form-select consultar-select"
                        value={modeloSelecionado || ''}
                        onChange={(e) =>
                          setModeloSelecionado(e.target.value || null)
                        }
                      >
                        <option value="">Todos os modelos</option>
                        {Object.keys(resumoPorModelo)
                          .sort((a, b) => a.localeCompare(b))
                          .map((m) => (
                            <option key={m} value={m}>
                              {m} ({resumoPorModelo[m]})
                            </option>
                          ))}
                      </select>

                      <div className="consultar-countMuted">
                        IMEIs filtrados: <strong>{imeisFiltrados.length}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="cabecalho-tabela">
                    <div>IMEI</div>
                    <div>Modelo</div>
                    <div>Status</div>
                  </div>

                  {detalhesFiltrados.map((d) => (
                    <div className="linha-imei" key={d.imei}>
                      <div className="consultar-mono">{d.imei}</div>
                      <div>{d.modelo || '-'}</div>
                      <div>
                        <span
                          className={`status ${String(d.status || '')
                            .toLowerCase()
                            .includes('ativo')
                            ? 'ativo'
                            : 'inativo'}`}
                        >
                          {d.status || 'SEM_STATUS'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Consultar;
