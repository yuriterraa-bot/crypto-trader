import axios from 'axios';
import crypto from 'crypto-js';

export const getBinanceCredentials = (mode?: 'demo' | 'real') => {
  // Se BINANCE_MODE estiver definido como 'real' nas variáveis de ambiente,
  // forçamos o modo 'real' em toda a aplicação.
  const activeMode = process.env.BINANCE_MODE === 'real' ? 'real' : (mode || process.env.BINANCE_MODE || 'demo');
  const isReal = activeMode === 'real';

  const baseUrl = isReal 
    ? 'https://fapi.binance.com'
    : 'https://demo-fapi.binance.com';

  const apiKey = isReal
    ? (process.env.BINANCE_REAL_API_KEY || process.env.BINANCE_API_KEY || '')
    : (process.env.BINANCE_API_KEY || '');

  const secretKey = isReal
    ? (process.env.BINANCE_REAL_SECRET_KEY || process.env.BINANCE_SECRET_KEY || '')
    : (process.env.BINANCE_SECRET_KEY || '');

  return { baseUrl, apiKey, secretKey, isReal };
};

const generateSignature = (queryString: string, secretKey: string) => {
  return crypto.HmacSHA256(queryString, secretKey).toString(crypto.enc.Hex);
};

const createQueryString = (params: Record<string, any>) => {
  return Object.keys(params)
    .filter(key => params[key] !== undefined)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
};

export const getBinanceClient = (mode?: 'demo' | 'real') => {
  const { baseUrl, apiKey } = getBinanceCredentials(mode);
  return axios.create({
    baseURL: baseUrl,
    headers: {
      'X-MBX-APIKEY': apiKey,
    },
  });
};

const api = {
  get: (url: string, config?: any) => getBinanceClient().get(url, config),
  post: (url: string, data?: any, config?: any) => getBinanceClient().post(url, data, config),
  delete: (url: string, config?: any) => getBinanceClient().delete(url, config),
  put: (url: string, data?: any, config?: any) => getBinanceClient().put(url, data, config),
};

export const getBalance = async (mode?: 'demo' | 'real') => {
  const { secretKey } = getBinanceCredentials(mode);
  const timestamp = Date.now();
  const queryString = createQueryString({ timestamp });
  const signature = generateSignature(queryString, secretKey);

  try {
    const response = await getBinanceClient(mode).get(`/fapi/v2/balance?${queryString}&signature=${signature}`);
    return response.data;
  } catch (error) {
    console.error('Binance API Error (getBalance):', error);
    throw error;
  }
};

export const getPrice = async (symbol: string) => {
  try {
    const response = await api.get(`/fapi/v1/ticker/price?symbol=${symbol}`);
    return response.data;
  } catch (error) {
    console.error('Binance API Error (getPrice):', error);
    throw error;
  }
};

export const getPrices = async () => {
  try {
    const response = await api.get(`/fapi/v1/ticker/price`);
    return response.data;
  } catch (error) {
    console.error('Binance API Error (getPrices):', error);
    throw error;
  }
};

export const getPositions = async (symbol?: string, mode?: 'demo' | 'real') => {
  const { secretKey } = getBinanceCredentials(mode);
  const timestamp = Date.now();
  const params: Record<string, any> = { timestamp };
  if (symbol) {
    params.symbol = symbol;
  }
  
  const queryString = createQueryString(params);
  const signature = generateSignature(queryString, secretKey);

  try {
    const response = await getBinanceClient(mode).get(`/fapi/v2/positionRisk?${queryString}&signature=${signature}`);
    return response.data;
  } catch (error) {
    console.error('Binance API Error (getPositions):', error);
    throw error;
  }
};

export const createOrder = async (
  symbol: string,
  side: 'BUY' | 'SELL',
  type: 'LIMIT' | 'MARKET' | 'STOP' | 'TAKE_PROFIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET',
  quantity: number,
  price?: number,
  timeInForce?: 'GTC' | 'IOC' | 'FOK'
) => {
  throw new Error("A API Binance está em modo READ-ONLY. Operação de criação de ordem bloqueada.");
};

export const cancelOrder = async (symbol: string, orderId: number) => {
  throw new Error("A API Binance está em modo READ-ONLY. Operação de cancelamento de ordem bloqueada.");
};

export const fetchCandles = async (symbol: string, interval: string = '15m', limit: number = 200) => {
  try {
    const response = await api.get(`/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    return response.data.map((k: any) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (error) {
    console.error('Binance API Error (fetchCandles):', error);
    throw error;
  }
};

export const getKlines = fetchCandles; // Keep compatibility

export const setLeverage = async (symbol: string, leverage: number) => {
  throw new Error("A API Binance está em modo READ-ONLY. Operação de alavancagem bloqueada.");
};

export const createRawOrder = async (params: Record<string, any>) => {
  throw new Error("A API Binance está em modo READ-ONLY. Operação de criação de ordem bloqueada.");
};

/**
 * Mantido apenas para referência (Bloqueado)
 */
export const closePosition = async (symbol: string, side: 'BUY' | 'SELL', quantity?: number) => {
  throw new Error("A API Binance está em modo READ-ONLY. Operação de fechamento de posição bloqueada.");
};

/**
 * Mantido apenas para referência (Bloqueado)
 */
export const openPosition = async (
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  leverage: number = 3
) => {
  throw new Error("A API Binance está em modo READ-ONLY. Operação de abertura de posição bloqueada.");
};


/**
 * Calcula a quantidade de contratos para um dado valor USDT e preço
 */
export const calculateQuantity = (
  usdtAmount: number,
  price: number,
  symbol: string
): number => {
  const raw = usdtAmount / price;
  if (symbol.includes('BTC')) return Math.floor(raw * 1000) / 1000;   // 3 casas decimais
  if (symbol.includes('ETH')) return Math.floor(raw * 100) / 100;     // 2 casas decimais
  return Math.floor(raw * 10) / 10;                                    // 1 casa decimal
};

/**
 * Busca dados de ticker 24h para um símbolo
 */
export const fetchTicker24h = async (symbol: string) => {
  try {
    const response = await api.get(`/fapi/v1/ticker/24hr?symbol=${symbol}`);
    return {
      priceChange: parseFloat(response.data.priceChange),
      priceChangePercent: parseFloat(response.data.priceChangePercent),
      weightedAvgPrice: parseFloat(response.data.weightedAvgPrice),
      lastPrice: parseFloat(response.data.lastPrice),
      volume: parseFloat(response.data.volume),
      quoteVolume: parseFloat(response.data.quoteVolume),
      highPrice: parseFloat(response.data.highPrice),
      lowPrice: parseFloat(response.data.lowPrice),
    };
  } catch (error) {
    console.error(`Binance API Error (fetchTicker24h) for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Busca a taxa de financiamento (Funding Rate) atual e preço premium do ativo
 */
export const fetchFundingRate = async (symbol: string) => {
  try {
    const response = await api.get(`/fapi/v1/premiumIndex?symbol=${symbol}`);
    return {
      markPrice: parseFloat(response.data.markPrice),
      indexPrice: parseFloat(response.data.indexPrice),
      estimatedSettlePrice: parseFloat(response.data.estimatedSettlePrice),
      lastFundingRate: parseFloat(response.data.lastFundingRate),
      nextFundingTime: response.data.nextFundingTime,
    };
  } catch (error) {
    console.error(`Binance API Error (fetchFundingRate) for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Busca o Open Interest atual para um símbolo
 */
export const fetchOpenInterest = async (symbol: string) => {
  try {
    const response = await api.get(`/fapi/v1/openInterest?symbol=${symbol}`);
    return {
      openInterest: parseFloat(response.data.openInterest),
      symbol: response.data.symbol,
    };
  } catch (error) {
    console.error(`Binance API Error (fetchOpenInterest) for ${symbol}:`, error);
    return { openInterest: 0, symbol };
  }
};

/**
 * Busca a proporção de posições Long/Short globais
 */
export const fetchLongShortRatio = async (symbol: string, period = '5m') => {
  try {
    const response = await api.get(`/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=1`);
    if (response.data && response.data.length > 0) {
      const data = response.data[0];
      return {
        longShortRatio: parseFloat(data.longShortRatio),
        longAccount: parseFloat(data.longAccount),
        shortAccount: parseFloat(data.shortAccount),
        timestamp: data.timestamp,
      };
    }
    return { longShortRatio: 1.0, longAccount: 0.5, shortAccount: 0.5, timestamp: Date.now() };
  } catch (error) {
    console.error(`Binance API Error (fetchLongShortRatio) for ${symbol}:`, error);
    return { longShortRatio: 1.0, longAccount: 0.5, shortAccount: 0.5, timestamp: Date.now() };
  }
};

/**
 * Busca histórico de trades da conta Binance (últimos 90 dias ou por par)
 */
export const getUserTrades = async (symbol?: string, startTime?: number, mode?: 'demo' | 'real') => {
  const { secretKey } = getBinanceCredentials(mode);
  const timestamp = Date.now();
  const params: Record<string, any> = { timestamp };
  
  if (symbol) {
    params.symbol = symbol;
  }
  if (startTime) {
    params.startTime = startTime;
  }

  const queryString = createQueryString(params);
  const signature = generateSignature(queryString, secretKey);

  try {
    const response = await getBinanceClient(mode).get(`/fapi/v1/userTrades?${queryString}&signature=${signature}`);
    return response.data;
  } catch (error) {
    console.error(`Binance API Error (getUserTrades) for ${symbol || 'all'}:`, error);
    throw error;
  }
};

export const fetchTradeHistory = getUserTrades;

export const fetchIncomeHistory = async (startTime?: number, mode?: 'demo' | 'real') => {
  const { secretKey } = getBinanceCredentials(mode);
  const timestamp = Date.now();
  const params: Record<string, any> = { timestamp };
  
  if (startTime) {
    params.startTime = startTime;
  }

  const queryString = createQueryString(params);
  const signature = generateSignature(queryString, secretKey);

  try {
    const response = await getBinanceClient(mode).get(`/fapi/v1/income?${queryString}&signature=${signature}`);
    return response.data;
  } catch (error) {
    console.error('Binance API Error (fetchIncomeHistory):', error);
    throw error;
  }
};



