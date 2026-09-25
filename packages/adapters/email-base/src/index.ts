import { z } from 'zod';

export const emailFamilySchema = z.enum(['newsletters', 'automations', 'gifts']);
export type EmailFamily = z.infer<typeof emailFamilySchema>;

/** IDs are opaque. Only a provider may normalize its own message IDs. */
export const emailEventSchema = z
  .object({
    id: z.string().min(1).max(1000),
    family: emailFamilySchema,
    type: z.enum(['delivered', 'opened', 'failed', 'unsubscribed', 'complained']),
    severity: z.enum(['temporary', 'permanent']).optional(),
    recipientEmail: z.string().email().max(191),
    providerId: z.string().min(1).max(1000),
    emailId: z.string().length(24).optional(),
    timestamp: z.coerce.date(),
    error: z
      .object({
        code: z.union([z.string(), z.number()]).optional(),
        message: z.string().max(2000).optional(),
        enhancedCode: z.string().max(100).optional(),
      })
      .nullable()
      .optional(),
    // A permanent rejection is not necessarily an invalid mailbox. Providers
    // must classify this explicitly; transport (poll/webhook) is irrelevant.
    suppress: z.boolean().default(false),
  })
  .superRefine((event, ctx) => {
    if (event.type === 'failed' && !event.severity) {
      ctx.addIssue({ code: 'custom', message: 'Failed events require a severity' });
    }
    if (
      event.suppress &&
      !(event.type === 'complained' || (event.type === 'failed' && event.severity === 'permanent'))
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Only complaints and permanent failures can suppress an address',
      });
    }
  });
export type EmailEvent = z.infer<typeof emailEventSchema>;

export interface NewsletterMessage {
  subject: string;
  html: string;
  plaintext: string;
  from: string;
  replyTo?: string;
  domainOverride?: string;
  emailId: string;
  recipients: { email: string; replacements: { id: string; value: string }[] }[];
  replacementDefinitions: { id: string; token: RegExp; trusted?: boolean }[];
}

export interface SendingOptions {
  openTrackingEnabled: boolean;
  clickTrackingEnabled: boolean;
  deliveryTime?: Date;
}

export interface SingleMessage {
  family: 'automations' | 'gifts';
  correlationId?: string;
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  trackOpens?: boolean;
  listUnsubscribe?: string;
  disableTracking?: boolean;
}

export interface PollOptions {
  family: EmailFamily;
  begin: Date;
  end: Date;
  maxEvents: number;
  events?: EmailEvent['type'][];
  batchHandler: (events: EmailEvent[]) => Promise<void>;
}

export interface WebhookRequest {
  body: Buffer;
  headers: Readonly<Record<string, string | string[] | undefined>>;
}

// Handshakes are verified by the provider, just like event notifications.
export type WebhookResult =
  | { events: EmailEvent[] }
  | { response: { status: 200 | 204; body?: string; contentType?: string } };
export type EventSource =
  | { type: 'poll'; fetch: (options: PollOptions) => Promise<{ safeCursor?: Date } | void> }
  | { type: 'webhook'; verify: (request: WebhookRequest) => Promise<WebhookResult> };

export abstract class EmailProviderBase {
  readonly version = 1;
  readonly requiredFns = Object.freeze([
    'isConfigured',
    'send',
    'sendSingle',
    'getMaximumRecipients',
    'getTargetDeliveryWindow',
    'getEventSource',
    'removeSuppression',
  ]);

  /** Stable identity of this provider account, unique amongst retained sources. */
  abstract readonly source: string;
  abstract isConfigured(): boolean;
  abstract send(
    message: NewsletterMessage,
    options: SendingOptions,
  ): Promise<{ id: string | null }>;
  abstract sendSingle(message: SingleMessage): Promise<{ id: string }>;
  abstract getMaximumRecipients(): number;
  abstract getTargetDeliveryWindow(): number;
  abstract getEventSource(): EventSource;
  /** Idempotent. Providers without remote lists may implement this as a no-op. */
  abstract removeSuppression(
    email: string,
    reason: 'bounce' | 'complaint' | 'unsubscribe',
  ): Promise<void>;
}
