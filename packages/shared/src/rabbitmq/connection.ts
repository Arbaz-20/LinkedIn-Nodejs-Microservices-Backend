import amqp, { ChannelModel, Connection, Channel, ConfirmChannel } from 'amqplib';
import { logger } from '../logger';

/**
 * Manages a single AMQP connection plus a round-robin pool of confirm channels
 * for publishing. Consumers get their own dedicated channels (see consumer.ts)
 * so that a consumer's prefetch/ack lifecycle never blocks publishers.
 *
 * The connection auto-reconnects on close with a fixed backoff.
 */
class RabbitMQManager {
  private connection: ChannelModel | null = null;
  private publishChannels: ConfirmChannel[] = [];
  private currentIndex = 0;
  private url = '';
  private poolSize = 3;
  private connecting: Promise<void> | null = null;
  private closed = false;

  async connect(url: string, poolSize = 3): Promise<void> {
    this.url = url;
    this.poolSize = poolSize;
    this.closed = false;
    if (this.connection) return;
    if (this.connecting) return this.connecting;

    this.connecting = this.establish();
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async establish(): Promise<void> {
    this.connection = await amqp.connect(this.url);

    this.connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });
    this.connection.on('close', () => {
      this.connection = null;
      this.publishChannels = [];
      if (this.closed) return;
      logger.warn('RabbitMQ connection closed — reconnecting in 5s');
      setTimeout(() => {
        this.connect(this.url, this.poolSize).catch((err) =>
          logger.error({ err }, 'RabbitMQ reconnect failed'),
        );
      }, 5000);
    });

    this.publishChannels = [];
    for (let i = 0; i < this.poolSize; i++) {
      const ch = await this.connection.createConfirmChannel();
      this.publishChannels.push(ch);
    }
    logger.info({ poolSize: this.poolSize }, 'RabbitMQ connected, publish channel pool ready');
  }

  /** Round-robin a confirm channel from the publish pool. */
  getPublishChannel(): ConfirmChannel {
    if (this.publishChannels.length === 0) {
      throw new Error('RabbitMQ not connected — call connect() first');
    }
    const ch = this.publishChannels[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.publishChannels.length;
    return ch;
  }

  /** Create a fresh channel (used by consumers, which need their own prefetch). */
  async createChannel(prefetch = 10): Promise<Channel> {
    if (!this.connection) throw new Error('RabbitMQ not connected — call connect() first');
    const ch = await this.connection.createChannel();
    await ch.prefetch(prefetch);
    return ch;
  }

  isConnected(): boolean {
    return this.connection !== null && this.publishChannels.length > 0;
  }

  async close(): Promise<void> {
    this.closed = true;
    for (const ch of this.publishChannels) {
      try {
        await ch.close();
      } catch {
        /* ignore */
      }
    }
    this.publishChannels = [];
    try {
      await this.connection?.close();
    } catch {
      /* ignore */
    }
    this.connection = null;
  }
}

/** Process-wide singleton. */
export const rabbit = new RabbitMQManager();

export type { Connection, Channel, ConfirmChannel };
