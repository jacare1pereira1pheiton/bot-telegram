// Definição dos tipos de callback_data
export const CallbackTypes = {
  // Navegação principal
  SHOW_PLANS: 'show_plans',

  // Seleção de planos
  PLAN_BASIC_19: 'plan_basic_19',
  PLAN_BASIC_29: 'plan_basic_29',
  PLAN_PREMIUM_47: 'plan_premium_47',
  PLAN_PREMIUM_129: 'plan_premium_129',

  // Métodos de pagamento
  PAY_PIX: 'pay_pix',
  PAY_CARD: 'pay_card',
  PAY_BITCOIN: 'pay_bitcoin',

  // Confirmações de pagamento
  CHECK_PIX: 'check_pix',
  CHECK_BTC: 'check_btc',
  CARD_PAYMENT_DONE: 'card_payment_done'
} as const;

// Tipo que representa todos os valores possíveis de callback_data
export type CallbackData = typeof CallbackTypes[keyof typeof CallbackTypes];

// Interface para mapear callbacks para seus handlers
export interface CallbackHandler {
  (bot: TelegramBot, chatId: number, messageId: number): Promise<void>;
}

// Tipo para o mapa de handlers
export type CallbackHandlerMap = {
  [K in CallbackData]: CallbackHandler;
};