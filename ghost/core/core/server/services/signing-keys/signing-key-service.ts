import crypto from 'node:crypto';
import { promisify } from 'node:util';
import type { Knex } from 'knex';
import { z } from 'zod';
import * as errors from '@tryghost/errors';
import {
  getPublicKeyInfo,
  getPublicKeyInfoFromPublicKey,
  type PublicKeyInfo,
} from '../../lib/public-jwk';
import { DbDate } from '../../lib/db-types/date';

export type SigningKeyPurpose = 'members' | 'staff';

export interface SigningKey {
  privateKey: string;
  kid: string;
}

export interface Jwks {
  keys: { e: string; kid: string; kty: string; n: string; use: 'sig' }[];
}

/** Signing and verification keys for one purpose. */
export interface SigningKeyProvider {
  getSigningKey(): Promise<SigningKey>;
  /** Public PEM for a token's `kid`; the signing key's when the `kid` isn't published. */
  getVerificationKey(kid?: string): Promise<string>;
  /** Every published key, the signing key first. */
  getJwks(): Promise<Jwks>;
}

interface Keypair {
  publicKey: string;
  privateKey: string;
}

interface Logger {
  info(message: string): void;
  warn(message: string): void;
}

interface SettingsCache {
  get(key: string, options: { resolve: false }): unknown;
}

interface SettingsModel {
  findOne(
    data: { key: string },
    options: { transacting: Knex.Transaction; forUpdate: true },
  ): Promise<{ toJSON(): unknown } | null>;
  edit(
    data: { key: string; value: string | null }[],
    options: { transacting: Knex.Transaction; context: { internal: true } },
  ): Promise<unknown>;
}

type Transaction = <T>(fn: (transacting: Knex.Transaction) => Promise<T>) => Promise<T>;

const KeySetting = z.object({
  value: z.string().nullable(),
  created_at: DbDate,
  updated_at: DbDate.nullish(),
});

/** A key setting from the settings cache or a Settings model; null when the row is missing. */
function parseKeySetting(key: string, data: unknown) {
  if (data === undefined || data === null) {
    return null;
  }
  const result = KeySetting.safeParse(data);
  if (!result.success) {
    throw new errors.InternalServerError({
      message: `Invalid signing key setting: ${key}`,
      context: z.prettifyError(result.error),
    });
  }
  const { value, created_at: createdAt, updated_at: updatedAt } = result.data;
  return { value, changedAt: updatedAt ?? createdAt };
}

interface PurposeState {
  active: string | null;
  next: { privateKey: string; publishedAt: Date } | null;
  previous: { publicKey: string; since: Date } | null;
}

interface VerificationKey extends PublicKeyInfo {
  publicKey: string;
}

const HOUR = 60 * 60 * 1000;

export const MIN_MODULUS_LENGTH = 2048;
// Twice the 24h JWKS cache, so verifiers have the next key before it signs anything
export const PUBLISH_DELAY_MS = 48 * HOUR;
// Covers tokens (<=10m) signed by an instance whose settings haven't caught up yet
export const GRACE_PERIOD_MS = 2 * HOUR;

const SETTING_PREFIX: Record<SigningKeyPurpose, string> = {
  members: 'members',
  staff: 'ghost',
};

const PURPOSES: SigningKeyPurpose[] = ['members', 'staff'];

function settingKeys(purpose: SigningKeyPurpose) {
  const prefix = SETTING_PREFIX[purpose];
  return {
    active: `${prefix}_private_key`,
    activePublic: `${prefix}_public_key`,
    next: `${prefix}_next_private_key`,
    previous: `${prefix}_previous_public_key`,
  };
}

const generateKeyPair = promisify(crypto.generateKeyPair);

async function generateKeypair(): Promise<Keypair> {
  // PKCS#1 PEM, matching the format of existing keys
  return generateKeyPair('rsa', {
    modulusLength: MIN_MODULUS_LENGTH,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
}

// Only for private PEMs: Node 24.20+ can't re-export a key parsed from a PKCS#1 public PEM
function toPublicPem(privateKey: string): string {
  return crypto.createPublicKey(privateKey).export({ type: 'pkcs1', format: 'pem' }).toString();
}

function modulusLength(privateKey: string): number {
  return crypto.createPrivateKey(privateKey).asymmetricKeyDetails?.modulusLength ?? 0;
}

/**
 * Rotates the site signing keypairs, which live in settings so older Ghost
 * versions keep reading the active key.
 *
 * A new key is published in the JWKS for PUBLISH_DELAY_MS before it signs
 * anything; after the switch the old public key stays published for
 * GRACE_PERIOD_MS. Every write re-checks the rows it replaces under a lock, so
 * instances sharing a database can't publish or promote two different keys.
 */
export class SigningKeyService {
  private settingsCache: SettingsCache;
  private Settings: SettingsModel;
  private transaction: Transaction;
  private logging: Logger;
  private generateKeypair: () => Promise<Keypair>;
  private onRotationStarted?: () => Promise<void>;

  constructor({
    settingsCache,
    Settings,
    transaction,
    logging,
    generateKeypair: generate = generateKeypair,
    onRotationStarted,
  }: {
    settingsCache: SettingsCache;
    Settings: SettingsModel;
    transaction: Transaction;
    logging: Logger;
    generateKeypair?: () => Promise<Keypair>;
    /** Called after rotate() publishes a new key, so something advances it. */
    onRotationStarted?: () => Promise<void>;
  }) {
    this.settingsCache = settingsCache;
    this.Settings = Settings;
    this.transaction = transaction;
    this.logging = logging;
    this.generateKeypair = generate;
    this.onRotationStarted = onRotationStarted;
  }

  /** Advances any rotation that's due, and starts one for keys under 2048 bits. */
  async check(): Promise<void> {
    for (const purpose of PURPOSES) {
      await this.retirePrevious(purpose);
      await this.promoteNext(purpose);

      const { active, next } = this.getState(purpose);
      if (active && !next && modulusLength(active) < MIN_MODULUS_LENGTH) {
        await this.rotate(purpose);
      }
    }
  }

  /**
   * Publishes a new key for `purpose`, which starts signing once it's been
   * published for PUBLISH_DELAY_MS. Returns false if a new key is already pending.
   */
  async rotate(purpose: SigningKeyPurpose): Promise<boolean> {
    const k = settingKeys(purpose);
    const { privateKey } = await this.generateKeypair();
    const started = await this.update({ [k.next]: null }, { [k.next]: privateKey });
    this.logging.info(
      started
        ? `Signing keys: published a new ${purpose} key`
        : `Signing keys: a new ${purpose} key is already published`,
    );
    if (started) {
      await this.onRotationStarted?.();
    }
    return started;
  }

  /** Whether any key still has a rotation step ahead of it. */
  isRotating(): boolean {
    return PURPOSES.some((purpose) => {
      const { active, next, previous } = this.getState(purpose);
      return !!next || !!previous || (!!active && modulusLength(active) < MIN_MODULUS_LENGTH);
    });
  }

  forPurpose(purpose: SigningKeyPurpose): SigningKeyProvider {
    return {
      getSigningKey: () => this.getSigningKey(purpose),
      getVerificationKey: (kid) => this.getVerificationKey(purpose, kid),
      getJwks: () => this.getJwks(purpose),
    };
  }

  private async getSigningKey(purpose: SigningKeyPurpose): Promise<SigningKey> {
    const privateKey = this.getState(purpose).active;
    if (!privateKey) {
      throw new errors.IncorrectUsageError({ message: `No ${purpose} signing key` });
    }
    const { kid } = await getPublicKeyInfo(privateKey);
    return { privateKey, kid };
  }

  private async getVerificationKey(purpose: SigningKeyPurpose, kid?: string): Promise<string> {
    const keys = await this.getVerificationKeys(purpose);
    return (keys.find((key) => key.kid === kid) ?? keys[0]).publicKey;
  }

  private async getJwks(purpose: SigningKeyPurpose): Promise<Jwks> {
    const keys = await this.getVerificationKeys(purpose);
    return {
      keys: keys.map(({ kid, jwk }) => ({ e: jwk.e, kid, kty: jwk.kty, n: jwk.n, use: 'sig' })),
    };
  }

  /** Every published key, the signing key first. */
  private async getVerificationKeys(purpose: SigningKeyPurpose): Promise<VerificationKey[]> {
    const { active, next, previous } = this.getState(purpose);
    const fromPrivate = [active, next?.privateKey]
      .filter((pem): pem is string => !!pem)
      .map(async (privateKey) => ({
        ...(await getPublicKeyInfo(privateKey)),
        publicKey: toPublicPem(privateKey),
      }));
    const fromPublic = previous
      ? [
          getPublicKeyInfoFromPublicKey(previous.publicKey).then((info) => ({
            ...info,
            publicKey: previous.publicKey,
          })),
        ]
      : [];

    return Promise.all([...fromPrivate, ...fromPublic]);
  }

  private getState(purpose: SigningKeyPurpose): PurposeState {
    const k = settingKeys(purpose);
    const setting = (key: string) => {
      const parsed = parseKeySetting(key, this.settingsCache.get(key, { resolve: false }));
      return parsed?.value ? { value: parsed.value, changedAt: parsed.changedAt } : null;
    };
    const next = setting(k.next);
    const previous = setting(k.previous);

    return {
      active: setting(k.active)?.value ?? null,
      next: next && { privateKey: next.value, publishedAt: next.changedAt },
      previous: previous && { publicKey: previous.value, since: previous.changedAt },
    };
  }

  /**
   * Applies `changes` only if every setting in `expected` still holds its value and
   * `due.key` was written at least `due.after` ms ago, both read from the locked rows.
   */
  private update(
    expected: Record<string, string | null>,
    changes: Record<string, string | null>,
    due?: { key: string; after: number },
  ): Promise<boolean> {
    return this.transaction(async (transacting) => {
      for (const [key, value] of Object.entries(expected)) {
        const row = await this.Settings.findOne({ key }, { transacting, forUpdate: true });
        const setting = parseKeySetting(key, row?.toJSON());
        if ((setting?.value ?? null) !== value) {
          return false;
        }
        if (setting && due?.key === key && Date.now() - setting.changedAt.getTime() < due.after) {
          return false;
        }
      }

      await this.Settings.edit(
        Object.entries(changes).map(([key, value]) => ({ key, value })),
        { transacting, context: { internal: true } },
      );
      return true;
    });
  }

  private async retirePrevious(purpose: SigningKeyPurpose): Promise<void> {
    const { previous } = this.getState(purpose);
    if (!previous || Date.now() - previous.since.getTime() < GRACE_PERIOD_MS) {
      return;
    }

    const k = settingKeys(purpose);
    const retired = await this.update(
      { [k.previous]: previous.publicKey },
      { [k.previous]: null },
      { key: k.previous, after: GRACE_PERIOD_MS },
    );
    this.logging.info(
      retired
        ? `Signing keys: retired previous ${purpose} key`
        : `Signing keys: previous ${purpose} key already retired or not due`,
    );
  }

  private async promoteNext(purpose: SigningKeyPurpose): Promise<void> {
    const { active, next } = this.getState(purpose);
    if (!next || Date.now() - next.publishedAt.getTime() < PUBLISH_DELAY_MS) {
      return;
    }
    if (!active) {
      this.logging.warn(`Signing keys: no active ${purpose} key to replace`);
      return;
    }

    const k = settingKeys(purpose);
    const promoted = await this.update(
      { [k.active]: active, [k.next]: next.privateKey },
      {
        [k.active]: next.privateKey,
        [k.activePublic]: toPublicPem(next.privateKey),
        [k.previous]: toPublicPem(active),
        [k.next]: null,
      },
      { key: k.next, after: PUBLISH_DELAY_MS },
    );
    this.logging.info(
      promoted
        ? `Signing keys: now signing with the new ${purpose} key`
        : `Signing keys: new ${purpose} key already promoted or not due`,
    );
  }
}
