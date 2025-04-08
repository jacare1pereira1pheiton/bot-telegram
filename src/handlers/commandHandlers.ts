import TelegramBot, { Message } from 'node-telegram-bot-api';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { createAccessButton } from '../utils/keyboards';

// Queue for managing message order
const messageQueue = new Map<number, Promise<any>>();

export const handleStart = async (bot: TelegramBot, msg: Message) => {
  const chatId = msg.chat.id;
  
  // Initialize queue for this chat if it doesn't exist
  if (!messageQueue.has(chatId)) {
    messageQueue.set(chatId, Promise.resolve());
  }

  // Get the current queue
  let queue = messageQueue.get(chatId)!;

  try {
    // Add audio message to queue
    queue = queue.then(async () => {
      const audioPath = path.join(process.cwd(), 'assets', 'audio.mp3');
      if (fs.existsSync(audioPath)) {
        await bot.sendVoice(chatId, audioPath);
      } else {
        logger.error('Audio file not found:', audioPath);
      }
      // Add delay before next message
      await new Promise(resolve => setTimeout(resolve, 1500));
    });

    // Add image and text message to queue
    queue = queue.then(async () => {
      const imagePath = path.join(process.cwd(), 'assets', 'topo.jpeg');
      if (fs.existsSync(imagePath)) {
        await bot.sendPhoto(chatId, imagePath, {
          caption: 'Seja bem-vindo ao grupo VIP!',
          ...createAccessButton()
        });
      } else {
        logger.error('Image file not found:', imagePath);
        // If image is not found, still send welcome message with button
        await bot.sendMessage(chatId, 'Seja bem-vindo ao grupo VIP!', createAccessButton());
      }
    });

    // Update the queue
    messageQueue.set(chatId, queue);

    // Handle any errors in the queue
    queue.catch(error => {
      logger.error('Error in start command queue:', error);
    });

  } catch (error) {
    logger.error('Error in start command:', error);
    await bot.sendMessage(
      chatId,
      'Ocorreu um erro ao iniciar o bot. Por favor, tente novamente.'
    );
  }
};