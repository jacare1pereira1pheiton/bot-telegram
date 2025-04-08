import TelegramBot, { CallbackQuery } from 'node-telegram-bot-api';
import { logger } from '../utils/logger';
import { PaymentManager } from '../services/PaymentManager';
import {
  createPlansKeyboard,
  createPaymentMethodKeyboard,
  createPixPaymentKeyboard,
  createCardPaymentButtons,
  createBitcoinPaymentKeyboard
} from '../utils/keyboards';
import { PLANS } from '../config/payment.config';
import fs from 'fs';

const paymentManager = new PaymentManager();

// Store selected plans for users
const userPlans = new Map<number, typeof PLANS[keyof typeof PLANS]>();

export async function handleCallback(bot: TelegramBot, query: CallbackQuery) {
  if (!query.message) return;

  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const action = query.data;

  try {
    if (!action) return;

    // Show plans
    if (action === 'show_plans') {
      await bot.editMessageText(
        'Escolha seu plano de acesso:',
        {
          chat_id: chatId,
          message_id: messageId,
          ...createPlansKeyboard()
        }
      );
    }

    // Plan selection
    else if (action.startsWith('plan_')) {
      const planId = action.replace('plan_', '');
      const plan = Object.values(PLANS).find(p => p.id === planId);
      
      if (!plan) {
        throw new Error('Plano não encontrado');
      }

      userPlans.set(chatId, plan);

      await bot.editMessageText(
        'Escolha como deseja efetuar o pagamento:',
        {
          chat_id: chatId,
          message_id: messageId,
          ...createPaymentMethodKeyboard()
        }
      );
    }

    // Payment methods
    else if (action === 'pay_pix') {
      await handlePixPayment(bot, chatId, messageId);
    }
    else if (action === 'pay_card') {
      await handleCardPayment(bot, chatId, messageId);
    }
    else if (action === 'pay_bitcoin') {
      await handleBitcoinPayment(bot, chatId, messageId);
    }

    // Payment confirmations
    else if (action === 'card_payment_done') {
      await bot.editMessageText(
        'Após o pagamento você recebe um e-mail. Verifique a caixa de entrada e de spam.',
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Já efetuei o pagamento', callback_data: 'card_payment_done' }
            ]]
          }
        }
      );
    }
    else if (action === 'check_pix' || action === 'check_btc') {
      await bot.editMessageText(
        'Pagamento em análise. Aguarde a confirmação.',
        {
          chat_id: chatId,
          message_id: messageId,
          ...action === 'check_pix' ? createPixPaymentKeyboard() : createBitcoinPaymentKeyboard()
        }
      );
    }

    await bot.answerCallbackQuery(query.id);

  } catch (error) {
    logger.error('Error in callback handler:', error);
    await bot.answerCallbackQuery(query.id, {
      text: 'Ocorreu um erro. Tente novamente.',
      show_alert: true
    });
  }
}

async function handlePixPayment(bot: TelegramBot, chatId: number, messageId: number) {
  try {
    await bot.editMessageText(
      '🔄 Gerando código PIX, aguarde...',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );

    const selectedPlan = userPlans.get(chatId);
    if (!selectedPlan) {
      throw new Error('Nenhum plano selecionado');
    }

    const pixPayment = await paymentManager.createPayment('pix', selectedPlan.price, selectedPlan.description);
    
    if (!pixPayment.success || !('qrCodePath' in pixPayment) || !('copyPaste' in pixPayment)) {
      throw new Error('Falha ao gerar pagamento PIX');
    }

    // Verify QR code file exists and is accessible
    if (!pixPayment.qrCodePath || !fs.existsSync(pixPayment.qrCodePath)) {
      throw new Error('QR Code file not found or inaccessible');
    }

    // Send QR Code
    await bot.sendPhoto(chatId, fs.createReadStream(pixPayment.qrCodePath), {
      caption: 'QR Code para pagamento'
    });

    // Clean up QR code file after sending
    try {
      fs.unlinkSync(pixPayment.qrCodePath);
    } catch (error) {
      logger.error('Error cleaning up QR code file:', error);
    }

    // Send amount and PIX key
    await bot.sendMessage(
      chatId,
      `✅ Código PIX gerado com sucesso!\n\n💰 Valor: R$ ${selectedPlan.price.toFixed(2)}\n\nCopie a chave PIX abaixo:`
    );

    await bot.sendMessage(
      chatId,
      `\`${pixPayment.copyPaste}\``,
      { parse_mode: 'Markdown' }
    );

    // Confirmation button
    await bot.sendMessage(
      chatId,
      '📌 Após o pagamento, clique no botão abaixo:',
      createPixPaymentKeyboard()
    );

  } catch (error) {
    logger.error('Error generating PIX:', error);
    await bot.editMessageText(
      '❌ Erro ao processar o pagamento.',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
  }
}

async function handleCardPayment(bot: TelegramBot, chatId: number, messageId: number) {
  try {
    const selectedPlan = userPlans.get(chatId);
    if (!selectedPlan) {
      throw new Error('Nenhum plano selecionado');
    }

    await bot.editMessageText(
      'Pague com cartão com 100% de segurança pela MundPay✅, só clicar no botão abaixo👇🏽',
      {
        chat_id: chatId,
        message_id: messageId,
        ...createCardPaymentButtons(selectedPlan.id)
      }
    );
  } catch (error) {
    logger.error('Error processing card payment:', error);
    await bot.editMessageText(
      '❌ Erro ao processar o pagamento.',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
  }
}

async function handleBitcoinPayment(bot: TelegramBot, chatId: number, messageId: number) {
  try {
    const selectedPlan = userPlans.get(chatId);
    if (!selectedPlan) {
      throw new Error('Nenhum plano selecionado');
    }

    const btcPayment = await paymentManager.createPayment('crypto', selectedPlan.price);
    
    if (!btcPayment.success || !('payAddress' in btcPayment) || !('amount' in btcPayment)) {
      throw new Error('Falha ao gerar pagamento Bitcoin');
    }

    await bot.editMessageText(
      `💰 Valor em Bitcoin: ${btcPayment.amount} BTC\n\nEndereço Bitcoin:\n\`${btcPayment.payAddress}\``,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        ...createBitcoinPaymentKeyboard()
      }
    );
  } catch (error) {
    logger.error('Error processing Bitcoin payment:', error);
    await bot.editMessageText(
      '❌ Erro ao processar o pagamento.',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
  }
}