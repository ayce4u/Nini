import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSign } from 'node:crypto';
import { connect } from 'node:http2';

/** Message reçu de l'API par la file Redis (même forme que côté API). */
export interface NotificationJob {
  phone?: string | null;
  pushToken?: string | null;
  title: string;
  body: string;
  link?: string;
}

export interface Channel {
  readonly name: string;
  enabled(): boolean;
  send(job: NotificationJob): Promise<void>;
}

/**
 * Notifications iPhone (Apple Push Notification service).
 * Il faut une clé .p8 créée dans le compte Apple Developer.
 */
@Injectable()
export class ApplePushChannel implements Channel {
  readonly name = 'apple-push';
  private token?: { value: string; createdAt: number };

  constructor(private readonly config: ConfigService) {}

  enabled() {
    return !!(
      this.config.get('APNS_KEY') &&
      this.config.get('APNS_KEY_ID') &&
      this.config.get('APNS_TEAM_ID')
    );
  }

  async send(job: NotificationJob) {
    if (!job.pushToken) return;
    const host =
      this.config.get('APNS_PRODUCTION') === 'true'
        ? 'https://api.push.apple.com'
        : 'https://api.sandbox.push.apple.com';
    const payload = JSON.stringify({
      aps: { alert: { title: job.title, body: job.body }, sound: 'default' },
      link: job.link,
    });

    await new Promise<void>((resolve, reject) => {
      const client = connect(host);
      client.on('error', reject);
      const req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${job.pushToken}`,
        authorization: `bearer ${this.jwt()}`,
        'apns-topic': this.config.get('APNS_BUNDLE_ID', 'ml.nini.app'),
        'apns-push-type': 'alert',
        'content-type': 'application/json',
      });
      let status = 0;
      let body = '';
      req.on('response', (headers) => (status = Number(headers[':status'])));
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        client.close();
        if (status === 200) resolve();
        else reject(new Error(`Apple a répondu ${status} ${body}`));
      });
      req.on('error', reject);
      req.end(payload);
    });
  }

  /** Jeton signé exigé par Apple, renouvelé toutes les 50 minutes. */
  private jwt(): string {
    if (this.token && Date.now() - this.token.createdAt < 50 * 60_000)
      return this.token.value;
    const b64 = (v: object | Buffer) =>
      Buffer.from(v instanceof Buffer ? v : JSON.stringify(v)).toString(
        'base64url',
      );
    const header = b64({ alg: 'ES256', kid: this.config.get('APNS_KEY_ID') });
    const claims = b64({
      iss: this.config.get('APNS_TEAM_ID'),
      iat: Math.floor(Date.now() / 1000),
    });
    const key = String(this.config.get('APNS_KEY')).replace(/\\n/g, '\n');
    const signature = createSign('SHA256')
      .update(`${header}.${claims}`)
      .sign({ key, dsaEncoding: 'ieee-p1363' });
    const value = `${header}.${claims}.${b64(signature)}`;
    this.token = { value, createdAt: Date.now() };
    return value;
  }
}

/**
 * Messages WhatsApp via l'API officielle de Meta (WhatsApp Business Cloud API).
 * Pour écrire en premier à quelqu'un, Meta impose un « modèle » de message validé :
 * on utilise un modèle à deux variables (titre, texte), nommé par WHATSAPP_TEMPLATE.
 */
@Injectable()
export class WhatsAppChannel implements Channel {
  readonly name = 'whatsapp';

  constructor(private readonly config: ConfigService) {}

  enabled() {
    return !!(
      this.config.get('WHATSAPP_TOKEN') && this.config.get('WHATSAPP_PHONE_ID')
    );
  }

  async send(job: NotificationJob) {
    if (!job.phone) return;
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${this.config.get('WHATSAPP_PHONE_ID')}/messages`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.config.get('WHATSAPP_TOKEN')}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: job.phone.replace(/^\+/, ''),
          type: 'template',
          template: {
            name: this.config.get('WHATSAPP_TEMPLATE', 'nini_notification'),
            language: { code: 'fr' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: job.title },
                  { type: 'text', text: job.body },
                ],
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok)
      throw new Error(`WhatsApp a répondu ${res.status} ${await res.text()}`);
  }
}

/**
 * SMS via l'API SMS d'Orange (developer.orange.com), disponible au Mali.
 */
@Injectable()
export class OrangeSmsChannel implements Channel {
  readonly name = 'sms-orange';
  private token?: { value: string; expiresAt: number };

  constructor(private readonly config: ConfigService) {}

  enabled() {
    return !!(
      this.config.get('ORANGE_CLIENT_ID') &&
      this.config.get('ORANGE_CLIENT_SECRET') &&
      this.config.get('ORANGE_SENDER')
    );
  }

  async send(job: NotificationJob) {
    if (!job.phone) return;
    const sender = `tel:${this.config.get('ORANGE_SENDER')}`;
    const res = await fetch(
      `https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(sender)}/requests`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${await this.accessToken()}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          outboundSMSMessageRequest: {
            address: `tel:${job.phone}`,
            senderAddress: sender,
            senderName: this.config.get('SMS_SENDER_NAME', 'Nini'),
            // Un SMS fait 160 caractères : on garde le texte court.
            outboundSMSTextMessage: {
              message: `${job.title} : ${job.body}`.slice(0, 300),
            },
          },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok)
      throw new Error(`Orange SMS a répondu ${res.status} ${await res.text()}`);
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000)
      return this.token.value;
    const basic = Buffer.from(
      `${this.config.get('ORANGE_CLIENT_ID')}:${this.config.get('ORANGE_CLIENT_SECRET')}`,
    ).toString('base64');
    const res = await fetch('https://api.orange.com/oauth/v3/token', {
      method: 'POST',
      headers: {
        authorization: `Basic ${basic}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Connexion à Orange refusée (${res.status})`);
    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  }
}

/** En développement (ou sans fournisseur configuré) : le message est simplement affiché dans les journaux. */
@Injectable()
export class ConsoleChannel implements Channel {
  readonly name = 'console';
  private readonly logger = new Logger('Notification');

  enabled() {
    return true;
  }

  async send(job: NotificationJob) {
    this.logger.log(`→ ${job.phone ?? 'iPhone'} | ${job.title} | ${job.body}`);
  }
}
