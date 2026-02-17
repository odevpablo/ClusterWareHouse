// Configuração da API
// URL base da API
// 1. Se existir uma variável de ambiente REACT_APP_API_URL, ela tem prioridade
// 2. Caso contrário, usa localhost como padrão (inclusive em produção)
const API_BASE_URL_RAW = process.env.REACT_APP_API_URL 
  ? String(process.env.REACT_APP_API_URL).trim()
  : 'http://127.0.0.1:8000';
const API_BASE_URL = API_BASE_URL_RAW.replace(/\/$/, '');

// Base separada para o endpoint de QR, se desejado
const QR_BASE_URL_RAW = process.env.REACT_APP_QR_BASE || API_BASE_URL;
const QR_BASE_URL = QR_BASE_URL_RAW.replace(/\/$/, '');

// Quando em desenvolvimento, é possível forçar endpoints relativos para passar pelo proxy do CRA
const USE_DEV_PROXY = String(process.env.REACT_APP_USE_DEV_PROXY || '').toLowerCase() === 'true';

const baseApi = USE_DEV_PROXY ? '' : API_BASE_URL;
const baseQr = USE_DEV_PROXY ? '' : QR_BASE_URL;

const API_ENDPOINTS = {
  CLUSTERS: `${baseApi}/clusters`,
  CLUSTER_QRCODE: (clusterId) => `${baseQr}/clusters/${encodeURIComponent(String(clusterId))}/qrcode`,
  PROCESSAR_CSV: `${baseApi}/processar-csv`
};

const config = {
  API_BASE_URL,
  QR_BASE_URL,
  USE_DEV_PROXY,
  ...API_ENDPOINTS
};

export { API_ENDPOINTS };
export default config;
