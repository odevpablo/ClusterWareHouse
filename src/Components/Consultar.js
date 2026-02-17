import React, { useState, useRef, useEffect, useCallback } from 'react';
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

  // =============================
  // RENDER
  // =============================
  return (
    <div className="consultar-container">
      <h1>Consultar Produto</h1>

      <div className="input-group">
        <input
          type="text"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Digite o código ou escaneie o QR Code"
          className="form-control"
        />

        <button
          onClick={cameraAtiva ? pararCamera : iniciarCamera}
          className={`btn ${
            cameraAtiva ? 'btn-danger' : 'btn-primary'
          }`}
          disabled={iniciando}
        >
          {cameraAtiva
            ? 'Parar Câmera'
            : 'Escanear QR Code'}
        </button>
      </div>

      {erroCamera && (
        <div className="alert alert-warning mt-3">
          {erroCamera}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '20px 0',
        }}
      >
        <div
          id="scanner"
          ref={scannerRef}
          style={{
            width: 300,
            height: 300,
            display:
              cameraAtiva || iniciando
                ? 'block'
                : 'none',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        />
      </div>

      {carregando && (
        <div className="text-center">
          <div
            className="spinner-border text-primary"
            role="status"
          />
          <p>Buscando informações...</p>
        </div>
      )}

      {resultado && (
        <div className="card mt-4">
          <div className="card-body">
            <h3>{resultado.nome}</h3>
            <p className="text-muted">
              {resultado.descricao}
            </p>
            <p>
              Total de IMEIs:{' '}
              <strong>
                {resultado.total_imeis}
              </strong>
            </p>

            {imeisLista.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={baixarCsvImeis}
                >
                  Baixar Excel (CSV)
                </button>

                <p>
                  IMEIs:{' '}
                  <strong>
                    {imeisLista.join(', ')}
                  </strong>
                </p>

                <div className="mt-3">
                  <h4>Resumo por Status</h4>
                  {Object.keys(resumoPorStatus).length === 0 ? (
                    <p className="text-muted">Sem dados de status.</p>
                  ) : (
                    <div>
                      {Object.entries(resumoPorStatus).map(([status, qtd]) => (
                        <div key={status}>
                          <strong>{status}</strong>: {qtd}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <h4>Resumo por Modelo</h4>
                  {Object.keys(resumoPorModelo).length === 0 ? (
                    <p className="text-muted">Sem dados de modelo.</p>
                  ) : (
                    <div>
                      {Object.entries(resumoPorModelo).map(([modelo, qtd]) => (
                        <div key={modelo}>
                          <strong>{modelo}</strong>: {qtd}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lista-imeis mt-4">
                  <h4>Detalhes dos IMEIs</h4>
                  <div className="cabecalho-tabela">
                    <div>IMEI</div>
                    <div>Modelo</div>
                    <div>Status</div>
                  </div>

                  {detalhesArray.map((d) => (
                    <div className="linha-imei" key={d.imei}>
                      <div>{d.imei}</div>
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Consultar;
