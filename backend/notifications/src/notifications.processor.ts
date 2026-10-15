import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  ApplePushChannel,
  ConsoleChannel,
  OrangeSmsChannel,
  WhatsAppChannel,
  type Channel,
  type NotificationJob,
} from './channels.js';

export const NOTIFICATIONS_QUEUE = 'notifications';

/**
 * Traite chaque message déposé par l'API :
 * 1. une notification sur l'iPhone si la personne a l'app ;
 * 2. puis un message WhatsApp, ou un SMS si WhatsApp échoue ou n'est pas configuré.
 * En cas d'erreur, BullMQ réessaie plus tard (3 tentatives).
 */
@Processor(NOTIFICATIONS_QUEUE, { concurrency: 5 })
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly push: ApplePushChannel,
    private readonly whatsapp: WhatsAppChannel,
    private readonly sms: OrangeSmsChannel,
    private readonly console: ConsoleChannel,
  ) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<string[]> {
    const data = job.data;
    const sent: string[] = [];

    if (data.pushToken && this.push.enabled()) {
      await this.try(this.push, data, sent);
    }

    if (data.phone) {
      const messaging: Channel[] = [this.whatsapp, this.sms].filter((c) =>
        c.enabled(),
      );
      let delivered = false;
      for (const channel of messaging) {
        if (await this.try(channel, data, sent)) {
          delivered = true;
          break;
        }
      }
      if (!messaging.length)
        delivered = await this.try(this.console, data, sent);
      if (!delivered && !sent.length)
        throw new Error('Aucun canal n’a pu envoyer le message.');
    }

    if (!sent.length && !data.phone) await this.try(this.console, data, sent);
    this.logger.log(
      `Message « ${job.name} » envoyé par : ${sent.join(', ') || 'aucun canal'}`,
    );
    return sent;
  }

  private async try(
    channel: Channel,
    data: NotificationJob,
    sent: string[],
  ): Promise<boolean> {
    try {
      await channel.send(data);
      sent.push(channel.name);
      return true;
    } catch (err) {
      this.logger.warn(`${channel.name} : ${(err as Error).message}`);
      return false;
    }
  }
}
