import express from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { PUSHINPAY_CONFIG, NOWPAYMENTS_CONFIG } from '../config/payment.config';
import TelegramBot from 'node-telegram-bot-api';

const router = express.Router();

// Store pending payments
const pendingPayments = new Map<string, {
  chatId: number;
  amount: number;
  planId: string;
}>();

export const setupWebhooks = (bot: TelegramBot) => {
  // PushinPay (PIX) webhook
  router.post('/webhook/pix', express.json(), async (req, res) => {
    try {
      const signature = req.headers['x-pushinpay-signature'];
      
      // Verify signature
      const isValid = verifyPushinPaySignature(req.body, signature as string);
      if (!isValid) {
        logger.warn('Invalid PushinPay signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const { transactionId, status } = req.body;
      
      if (status === 'COMPLETED') {
        const payment = pendingPayments.get(transactionId);
        if (payment) {
          await handleSuccessfulPayment(bot, payment.chatId, 'pix', payment.planId);
          pendingPayments.delete(transactionId);
        }
      }

      res.json({ status: 'ok' });
    } catch (error) {
      logger.error('Error processing PIX webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // NOWPayments webhook
  router.post('/webhook/crypto', express.json(), async (req, res) => {
    try {
      const signature = req.headers['x-nowpayments-sig'];
      
      // Verify signature
      const isValid = verifyNowPaymentsSignature(req.body, signature as string);
      if (!isValid) {
        logger.warn('Invalid NOWPayments signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const { payment_id, payment_status } = req.body;
      
      if (['finished', 'confirmed'].includes(payment_status)) {
        const payment = pendingPayments.get(payment_id);
        if (payment) {
          await handleSuccessfulPayment(bot, payment.chatId, 'crypto', payment.planId);
          pendingPayments.delete(payment_id);
        }
      }

      res.json({ status: 'ok' });
    } catch (error) {
      logger.error('Error processing crypto webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

// Add payment to pending payments
export const addPendingPayment = (
  paymentId: string,
  chatId: number,
  amount: number,
  planId: string
) => {
  pendingPayments.set(paymentId, { chatId, amount, planId });
};

// Verify PushinPay signature
function verifyPushinPaySignature(payload: any, signature: string): boolean {
  const data = JSON.stringify(payload);
  const expectedSignature = crypto
    .createHmac('sha256', PUSHINPAY_CONFIG.token!)
    .update(data)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Verify NOWPayments signature
function verifyNowPaymentsSignature(payload: any, signature: string): boolean {
  const data = JSON.stringify(payload);
  const expectedSignature = crypto
    .createHmac('sha512', NOWPAYMENTS_CONFIG.ipnSecret!)
    .update(data)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Handle successful payment
async function handleSuccessfulPayment(
  bot: TelegramBot,
  chatId: number,
  method: 'pix' | 'crypto',
  planId: string
) {
  try {
    await bot.sendMessage(
      chatId,
      `✅ Pagamento confirmado!\n\nSeu acesso será liberado em instantes.`
    );
    
    // Aqui você pode adicionar a lógica para liberar o acesso ao grupo
    logger.info(`Payment confirmed for chat ${chatId}, method: ${method}, plan: ${planId}`);
  } catch (error) {
    logger.error('Error handling successful payment:', error);
  }
}