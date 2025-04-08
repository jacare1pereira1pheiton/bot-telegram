import { InlineKeyboardButton } from 'node-telegram-bot-api';
import { MUNDPAY_CHECKOUT_URLS } from '../config/payment.config';

export const createAccessButton = () => ({
  reply_markup: {
    inline_keyboard: [[
      { text: 'Acessar grupo VIP', callback_data: 'show_plans' }
    ]]
  }
});

export const createPlansKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '✨ R$ 19,90 - Plano Semanal', callback_data: 'plan_basic_19' }],
      [{ text: '💫 R$ 29,90 - Plano 3 Meses', callback_data: 'plan_basic_29' }],
      [{ text: '⭐ R$ 47,90 - Plano 1 Ano', callback_data: 'plan_premium_47' }],
      [{ text: '🌟 R$ 129,90 - Plano Vitalício', callback_data: 'plan_premium_129' }]
    ]
  }
});

export const createPaymentMethodKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '📱 Pagar com PIX', callback_data: 'pay_pix' }],
      [{ text: '💳 Pagar com Cartão', callback_data: 'pay_card' }],
      [{ text: '₿ Pagar com Bitcoin', callback_data: 'pay_bitcoin' }]
    ]
  }
});

export const createPixPaymentKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [[
      { text: '✅ Já Paguei', callback_data: 'check_pix' }
    ]]
  }
});

export const createCardPaymentButtons = (planId: string) => {
  const cleanPlanId = planId.replace('plan_', '');
  const checkoutUrl = MUNDPAY_CHECKOUT_URLS[cleanPlanId as keyof typeof MUNDPAY_CHECKOUT_URLS];
  
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '💳 Pagar agora', url: checkoutUrl }],
        [{ text: '✅ Já efetuei o pagamento', callback_data: 'card_payment_done' }]
      ]
    }
  };
};

export const createBitcoinPaymentKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [[
      { text: '✅ Já Paguei', callback_data: 'check_btc' }
    ]]
  }
});