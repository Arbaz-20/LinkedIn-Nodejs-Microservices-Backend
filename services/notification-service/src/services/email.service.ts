import nodemailer, { Transporter } from 'nodemailer';
import { createLogger } from '@linkedin-clone/shared';
import { config } from '../config';

const logger = createLogger(config.SERVICE_NAME);

export interface SendEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

class EmailService {
  private transport: Transporter | null = null;
  private initialized = false;

  /** Lazily build the SMTP transport. Returns null when SMTP is not configured. */
  private getTransport = (): Transporter | null => {
    if (this.initialized) return this.transport;
    this.initialized = true;

    if (!config.SMTP_HOST) {
      logger.warn('SMTP_HOST not set — email delivery is disabled (no-op).');
      this.transport = null;
      return null;
    }

    this.transport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT ?? 587,
      secure: (config.SMTP_PORT ?? 587) === 465,
      auth:
        config.SMTP_USER && config.SMTP_PASS
          ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
          : undefined,
    });
    return this.transport;
  };

  /** Send a transactional email. No-ops with a warning when SMTP is unset. */
  public send = async (input: SendEmailInput): Promise<void> => {
    const transport = this.getTransport();
    if (!transport) {
      logger.warn({ to: input.to, subject: input.subject }, 'email skipped — SMTP disabled');
      return;
    }
    await transport.sendMail({
      from: config.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    logger.info({ to: input.to, subject: input.subject }, 'email sent');
  };
}

export const emailService = new EmailService();
