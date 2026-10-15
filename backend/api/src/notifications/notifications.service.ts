import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectDataSource } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity.js';
import { Provider } from '../providers/provider.entity.js';
import { User } from '../users/user.entity.js';
import { formatFr } from '../common/time.js';

export const NOTIFICATIONS_QUEUE = 'notifications';

/** Message déposé dans la file Redis, traité par le service de notifications. */
export interface NotificationJob {
  /** Numéro de téléphone au format international. */
  phone?: string | null;
  /** Jeton Apple Push de l'iPhone du destinataire. */
  pushToken?: string | null;
  title: string;
  body: string;
  /** Lien ouvert quand on touche la notification, ex. "/rendez-vous/123". */
  link?: string;
}

/**
 * L'API ne parle jamais directement aux services SMS, WhatsApp ou Apple :
 * elle dépose un message dans Redis et le service « notifications » s'en occupe.
 * Si ces services sont lents ou en panne, l'app continue de marcher.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly queue: Queue<NotificationJob>,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async appointmentRequested(appt: Appointment) {
    const provider = await this.providerContact(appt.providerId);
    await this.send('rdv-demande', {
      ...provider,
      title: 'Nouvelle demande de rendez-vous',
      body: `${await this.clientName(appt)} demande « ${appt.serviceName} » le ${formatFr(appt.startsAt)}. Ouvre l'app pour accepter.`,
      link: `/pro/planning?rdv=${appt.id}`,
    });
  }

  async appointmentConfirmed(appt: Appointment) {
    const client = await this.clientContact(appt);
    const provider = await this.db
      .getRepository(Provider)
      .findOneBy({ id: appt.providerId });
    await this.send('rdv-confirme', {
      ...client,
      title: 'Rendez-vous confirmé',
      body: `${provider?.businessName ?? 'Ton prestataire'} confirme « ${appt.serviceName} » le ${formatFr(appt.startsAt)}.`,
      link: `/rendez-vous/${appt.id}`,
    });
    await this.scheduleReminder(
      appt,
      provider?.businessName ?? 'ton prestataire',
    );
  }

  async appointmentDeclined(appt: Appointment) {
    const client = await this.clientContact(appt);
    await this.send('rdv-refuse', {
      ...client,
      title: 'Rendez-vous non disponible',
      body: `Le créneau du ${formatFr(appt.startsAt)} n'est pas disponible. Choisis un autre horaire dans l'app.`,
      link: `/prestataire/${appt.providerId}`,
    });
    await this.cancelReminder(appt.id);
  }

  async appointmentCancelled(appt: Appointment, by: 'client' | 'provider') {
    const target =
      by === 'client'
        ? await this.providerContact(appt.providerId)
        : await this.clientContact(appt);
    await this.send('rdv-annule', {
      ...target,
      title: 'Rendez-vous annulé',
      body: `Le rendez-vous « ${appt.serviceName} » du ${formatFr(appt.startsAt)} a été annulé.`,
    });
    await this.cancelReminder(appt.id);
  }

  async askForReview(appt: Appointment) {
    if (!appt.clientId) return;
    const client = await this.clientContact(appt);
    await this.send('avis', {
      ...client,
      title: 'Comment s’est passé ton rendez-vous ?',
      body: `Laisse une note à ton prestataire pour aider les autres clients.`,
      link: `/rendez-vous/${appt.id}/avis`,
    });
  }

  /** Rappel envoyé la veille du rendez-vous (ou tout de suite si c'est dans moins de 24 h). */
  private async scheduleReminder(appt: Appointment, businessName: string) {
    const client = await this.clientContact(appt);
    const delay = Math.max(
      appt.startsAt.getTime() - 24 * 3600_000 - Date.now(),
      0,
    );
    if (appt.startsAt.getTime() <= Date.now()) return;
    await this.queue
      .add(
        'rappel',
        {
          ...client,
          title: 'Rappel de rendez-vous',
          body: `N'oublie pas : « ${appt.serviceName} » chez ${businessName}, ${formatFr(appt.startsAt)}.`,
          link: `/rendez-vous/${appt.id}`,
        },
        {
          jobId: `rappel-${appt.id}`,
          delay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
        },
      )
      .catch((err) =>
        this.logger.warn(`Rappel non programmé : ${err.message}`),
      );
  }

  private async cancelReminder(appointmentId: string) {
    await this.queue.remove(`rappel-${appointmentId}`).catch(() => undefined);
  }

  private async send(name: string, job: NotificationJob) {
    if (!job.phone && !job.pushToken) return;
    await this.queue
      .add(name, job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 1000,
      })
      .catch((err) =>
        this.logger.warn(
          `Notification « ${name} » non envoyée : ${err.message}`,
        ),
      );
  }

  private async providerContact(providerId: string) {
    const provider = await this.db
      .getRepository(Provider)
      .findOne({ where: { id: providerId }, relations: { user: true } });
    const user = provider
      ? await this.db
          .getRepository(User)
          .findOne({
            where: { id: provider.userId },
            select: { id: true, phone: true, pushToken: true },
          })
      : null;
    return {
      phone: provider?.whatsapp ?? user?.phone,
      pushToken: user?.pushToken,
    };
  }

  private async clientContact(appt: Appointment) {
    if (!appt.clientId) return { phone: appt.clientPhone };
    const user = await this.db
      .getRepository(User)
      .findOne({
        where: { id: appt.clientId },
        select: { id: true, phone: true, pushToken: true },
      });
    return {
      phone: user?.phone ?? appt.clientPhone,
      pushToken: user?.pushToken,
    };
  }

  private async clientName(appt: Appointment) {
    if (!appt.clientId) return appt.clientName ?? 'Un client';
    const user = await this.db
      .getRepository(User)
      .findOneBy({ id: appt.clientId });
    return user ? `${user.firstName} ${user.lastName.charAt(0)}.` : 'Un client';
  }
}
