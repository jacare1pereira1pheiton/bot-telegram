import TelegramBot from 'node-telegram-bot-api';
import { handleStart } from './commandHandlers';
import { handleCallback } from './callbackHandlers';
import { handleMessage } from './messageHandlers';
import { logger } from '../utils/logger';

// Set to store processed message IDs
const processedMessages = new Set<string>();

// Timeout for message processing (5 minutes)
const MESSAGE_TIMEOUT = 5 * 60 * 1000;

// Map to store message timestamps
const messageTimestamps = new Map<string, number>();

export const setupHandlers = (bot: TelegramBot) => {
  // Middleware for deduplication and timeout
  bot.on('message', async (msg) => {
    const messageId = `${msg.chat.id}_${msg.message_id}`;
    const now = Date.now();
    
    // Check if message is too old
    if (msg.date * 1000 < now - MESSAGE_TIMEOUT) {
      logger.debug(`Skipping old message: ${messageId}`);
      return;
    }

    // Check for duplicate messages
    if (processedMessages.has(messageId)) {
      logger.debug(`Skipping duplicate message: ${messageId}`);
      return;
    }
    
    // Add message to processed set and timestamp
    processedMessages.add(messageId);
    messageTimestamps.set(messageId, now);
    
    // Cleanup old messages
    const cutoff = now - MESSAGE_TIMEOUT;
    for (const [id, timestamp] of messageTimestamps.entries()) {
      if (timestamp < cutoff) {
        messageTimestamps.delete(id);
        processedMessages.delete(id);
      }
    }

    try {
      if (msg.text === '/start') {
        await handleStart(bot, msg);
      } else {
        await handleMessage(bot, msg);
      }
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  });

  // Handle callback queries with deduplication
  const processedCallbacks = new Set<string>();
  
  bot.on('callback_query', async (query) => {
    if (!query.id || !query.message) return;

    const callbackId = `${query.message.chat.id}_${query.id}`;
    
    if (processedCallbacks.has(callbackId)) {
      logger.debug(`Skipping duplicate callback: ${callbackId}`);
      return;
    }

    processedCallbacks.add(callbackId);

    // Cleanup old callbacks (after 5 minutes)
    setTimeout(() => {
      processedCallbacks.delete(callbackId);
    }, MESSAGE_TIMEOUT);

    try {
      await handleCallback(bot, query);
    } catch (error) {
      logger.error('Error handling callback:', error);
      await bot.answerCallbackQuery(query.id, {
        text: 'Ocorreu um erro. Tente novamente.',
        show_alert: true
      });
    }
  });

  // Log handler setup
  logger.info('Bot handlers initialized successfully');
};