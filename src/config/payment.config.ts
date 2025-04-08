export const PUSHINPAY_CONFIG = {
  token: process.env.PUSHINPAY_TOKEN,
  apiUrl: 'https://api.pushinpay.com.br/api/v1',
  notificationUrl: process.env.PUSHINPAY_NOTIFICATION_URL
};

export const NOWPAYMENTS_CONFIG = {
  apiKey: process.env.NOWPAYMENTS_API_KEY,
  apiUrl: 'https://api.nowpayments.io/v1',
  ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET
};

export const MUNDPAY_CHECKOUT_URLS = {
  basic_19: 'https://global.mundpay.com/kydvf6yudb',  // Plano Semanal
  basic_29: 'https://global.mundpay.com/473a1xlo2i',  // Plano 3 Meses
  premium_47: 'https://global.mundpay.com/tkr5discz5', // Plano 1 Ano
  premium_129: 'https://global.mundpay.com/mn2n5x97oc' // Plano Vitalício
};

export const PLANS = {
  PREMIUM_129: {
    id: 'premium_129',
    title: '💎 VIP + Chamada de vídeo - $129.90',
    price: 129.90,
    description: 'Acesso Vitalício'
  },
  PREMIUM_47: {
    id: 'premium_47',
    title: '🔥 Grupo VIP Vitalício - $47.90',
    price: 47.90,
    description: 'Acesso por 1 Ano'
  },
  BASIC_29: {
    id: 'basic_29',
    title: '📆 Grupo VIP 3 Mês - $29.90',
    price: 29.90,
    description: 'Acesso por 3 Meses'
  },
  BASIC_19: {
    id: 'basic_19',
    title: '⏳ Grupo VIP 1 Semana - $19.90',
    price: 19.90,
    description: 'Acesso Semanal'
  }
} as const;