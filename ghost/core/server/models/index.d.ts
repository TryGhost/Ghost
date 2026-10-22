import type { Knex } from 'knex';

/**
 * Hand-written declarations for the Bookshelf model registry (`index.js`).
 *
 * Consumer-driven: each model documents only the surface a TypeScript
 * consumer is verified to use, plus the `findOne`/`add`/`edit`/`destroy`
 * methods every registry model shares. Extend a model's declaration in the
 * same PR that adds the TypeScript call site relying on it — do not type
 * ahead of verified usage, and do not widen a signature to silence an error.
 *
 * The registry itself exports many more models than are declared here;
 * `require()` callers are unaffected. Add a model's declaration when its
 * first typed consumer arrives.
 */

interface ModelOptions {
  id?: string;
  context?: { internal?: boolean; [key: string]: unknown };
  transacting?: Knex.Transaction;
  forUpdate?: boolean;
  withRelated?: string[];
  [key: string]: unknown;
}

interface ModelInstance {
  id: string;
  get(key: string): unknown;
  destroy(options?: ModelOptions): Promise<unknown>;
}

interface ModelStatic<Instance extends ModelInstance = ModelInstance> {
  findOne(data: Record<string, unknown>, options?: ModelOptions): Promise<Instance | null>;
  add(data: Record<string, unknown>, options?: ModelOptions): Promise<Instance>;
  edit(data: Record<string, unknown>, options?: ModelOptions): Promise<Instance>;
}

interface BaseRegistry {
  transaction<T>(callback: (transacting: Knex.Transaction) => Promise<T>): Promise<T>;
}

interface InviteInstance extends ModelInstance {
  get(key: 'expires'): number;
  get(key: 'email' | 'role_id' | 'token' | 'status'): string;
  get(key: string): unknown;
}

interface MemberInstance extends ModelInstance {
  get(key: 'name'): string | null | undefined;
  get(key: 'email' | 'status' | 'uuid'): string;
  get(key: 'enable_updates_and_announcements'): boolean | null | undefined;
  get(key: string): unknown;
  related(key: 'newsletters' | 'products'): { models: unknown[] };
}

export declare const Base: BaseRegistry;

export declare const Invite: ModelStatic<InviteInstance>;
export declare const User: ModelStatic;
export declare const Member: ModelStatic<MemberInstance>;
export declare const AutomatedEmailRecipient: ModelStatic;
export declare const WelcomeEmailAutomationRun: ModelStatic;

export declare const Email: ModelStatic;
export type Email = ModelStatic;
export declare const EmailRecipientFailure: ModelStatic;
export type EmailRecipientFailure = ModelStatic;
export declare const EmailSpamComplaintEvent: ModelStatic;
export type EmailSpamComplaintEvent = ModelStatic;
