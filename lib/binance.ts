import axios from 'axios';
import crypto from 'crypto-js';

const API_KEY = process.env.BINANCE_API_KEY || '';
const SECRET_KEY = process.env.BINANCE_SECRET_KEY || '';
const isTestnet = process.env.BINANCE_TESTNET === 'true';
const BASE_URL = isTestnet ? 'https://demo-fapi.binance.com' : 'https://fapi.binance.com';

const generateSignature = (queryString: string) => {
  return crypto.HmacSHA256(queryString, SECRET_KEY).toString(crypto.enc.Hex);
};

const createQueryString = (params: Record<string, any>) => {
  return Object.keys(params)
    .filter(key => params[key] !== undefined)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-MBX-APIKEY': API_KEY,
  },
});

export const getBalance = async () => {
  const timestamp = Date.now();
  const queryString = createQueryString({ timestamp });
  const signature = generateSignature(queryString);

  try {
    const response = await api.get(`/fapi/v2/balance?${queryString}&signature=${signature}`);
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

export const getPositions = async (symbol?: string) => {
  const timestamp = Date.now();
  const params: Record<string, any> = { timestamp };
  if (symbol) {
    params.symbol = symbol;
  }
  
  const queryString = createQueryString(params);
  const signature = generateSignature(queryString);

  try {
    const response = await api.get(`/fapi/v2/positionRisk?${queryString}&signature=${signature}`);
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
  const timestamp = Date.now();
  const params: Record<string, any> = {
    symbol,
    side,
    type,
    quantity,
    timestamp,
  };

  if (price) params.price = price;
  if (timeInForce) params.timeInForce = timeInForce;

  const queryString = createQueryString(params);
  const signature = generateSignature(queryString);

  try {
    const response = await api.post(`/fapi/v1/order?${queryString}&signature=${signature}`);
    return response.data;
  } catch (error) {
    console.error('Binance API Error (createOrder):', error);
    throw error;
  }
};

export const cancelOrder = async (symbol: string, orderId: number) => {
  const timestamp = Date.now();
  const queryString = createQueryString({ symbol, orderId, timestamp });
  const signature = generateSignature(queryString);

  try {
    const response = await api.delete(`/fapi/v1/order?${queryString}&signature=${signature}`);
    return response.data;
  } catch (error) {
    console.error('Binance API Error (cancelOrder):', error);
    throw error;
  }
};

export const getKlines = async (symbol: string, interval: string = '15m', limit: number = 200) => {
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
    console.error('Binance API Error (getKlines):', error);
    throw error;
  }
};

export const setLeverage = async (symbol: string, leverage: number) => {
  const timestamp = Date.now();
  const queryString = createQueryString({ symbol, leverage, timestamp });
  const signature = generateSignature(queryString);

  try {
    const response = await api.post(`/fapi/v1/leverage?${queryString}&signature=${signature}`);
    return response.data;
  } catch (error) {
    console.error('Binance API Error (setLeverage):', error);
    throw error;
  }
};

export const createRawOrder = async (params: Record<string, any>) => {
  const timestamp = Date.now();
  const allParams = { ...params, timestamp };
  const queryString = createQueryString(allParams);
  const signature = generateSignature(queryString);

  try {
    const response = await api.post(`/fapi/v1/order?${queryString}&signature=${signature}`);
    return response.data;
  } catch (error) {
    console.error('Binance API Error (createRawOrder):', error);
    throw error;
  }
};
