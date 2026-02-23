import axios from 'axios';
import { config } from '../config';
import { logger } from './logger';

export async function sendWebhook(message: string): Promise<void> {
  const payload = { text: message };

  if (config.notifications.slackWebhookUrl) {
    try {
      await axios.post(config.notifications.slackWebhookUrl, payload);
    } catch (err) {
      logger.warn('Slack webhook failed', { err });
    }
  }

  if (config.notifications.discordWebhookUrl) {
    try {
      await axios.post(config.notifications.discordWebhookUrl, { content: message });
    } catch (err) {
      logger.warn('Discord webhook failed', { err });
    }
  }
}
