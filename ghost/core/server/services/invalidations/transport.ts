import { z } from 'zod';

/**
 * What instances tell each other: which cache to reload, who said so and
 * when. Never keys or values: parsing drops any other field.
 */
export const invalidationMessageSchema = z.object({
  name: z.string(),
  origin: z.string(),
  /**
   * Sender's wall clock in epoch ms, for logging delivery latency. A peer
   * running an older version may not send it. Lenient, as instances of
   * different versions share a channel whatever the transport: a bad value
   * drops just this field, and the message still invalidates.
   */
  sentAt: z.number().optional().catch(undefined),
});

export type InvalidationMessage = z.infer<typeof invalidationMessageSchema>;

/** The registry's side of a transport. Handlers never reject. */
export interface TransportHandlers {
  onMessage(message: InvalidationMessage): Promise<void>;
  onConnectionLost(): void;
  onReconnected(): Promise<void>;
}

export interface InvalidationTransport {
  /**
   * Connects and starts delivering to the handlers. Resolves once subscribed,
   * or once it has reported the connection lost and is retrying: a broker that
   * is away does not reject.
   */
  subscribe(handlers: TransportHandlers): Promise<void>;
  /**
   * Resolves once the broker has the message, or the transport is holding it
   * to send when it reconnects. Rejects when it can do neither.
   */
  publish(message: InvalidationMessage): Promise<void>;
  /** Stops delivery and releases connections. Safe after a partial subscribe. */
  close(): Promise<void>;
}

/** A single instance: there are no peers to tell or hear from. */
export class LocalTransport implements InvalidationTransport {
  async subscribe() {}

  async publish() {}

  async close() {}
}
