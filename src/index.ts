import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import { setupHandlers } from './handlers';
import { setupWebhooks } from './webhooks';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const token = process.env.BOT_TOKEN;
const port = process.env.PORT || 3000;

if (!token) {
  logger.error('BOT_TOKEN is required in environment variables');
  process.exit(1);
}

// Create Express app
const app = express();

// Create bot instance with proper polling configuration
const bot = new TelegramBot(token, {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

// Setup message handlers
setupHandlers(bot);

// Setup webhooks routes
app.use('/api', setupWebhooks(bot));

// Start Express server
app.listen(port, () => {
  logger.info(`Webhook server is running on port ${port}`);
});

// Log successful initialization
bot.getMe().then((botInfo) => {
  logger.info(`Bot started successfully: @${botInfo.username}`);
}).catch((error) => {
  logger.error('Failed to get bot info:', error);
});

// Error handling
bot.on('polling_error', (error) => {
  logger.error('Polling error:', error);
});

bot.on('error', (error) => {
  logger.error('Bot error:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});