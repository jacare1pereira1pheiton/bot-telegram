import TelegramBot, { Message } from 'node-telegram-bot-api';
import { logger } from '../utils/logger';

export const handleMessage = async (bot: TelegramBot, msg: Message) => {
  try {
    if (!msg.text?.startsWith('/')) {
      await bot.sendMessage(msg.chat.id, 'Mensagem recebida!');
    }
  } catch (error) {
    logger.error('Error in message handler:', error);
  }
};