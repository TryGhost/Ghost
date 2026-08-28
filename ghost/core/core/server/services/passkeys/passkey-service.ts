const crypto = require('node:crypto');
const errors = require('@tryghost/errors');
const models = require('../../models');
const db = require('../../data/db');
import ObjectId from 'bson-objectid';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import {
  authenticationResponseSchema,
  ceremonySchema,
  registrationResponseSchema,
  transportsSchema,
  type Ceremony,
  type CeremonyPurpose,
} from './schema';

const CEREMONY_TTL_MS = 5 * 60 * 1000;
const CEREMONY_HMAC_CONTEXT = 'ghost:passkey-ceremony:v1:';

type CredentialModel = {
  id: string;
  get<T>(key: string): T;
};

type CredentialCollection = {
  length: number;
  models: CredentialModel[];
};

type CredentialOwner = {
  userId?: string;
  memberId?: string;
};

type CredentialLookup = CredentialOwner & {
  rpID: string;
};

type RegistrationOptionsInput = CredentialOwner & {
  email: string;
  name?: string | null;
  origin: string;
};

type RegisterInput = CredentialOwner & {
  origin: string;
  expectedChallenge: string;
  response: unknown;
  name?: string;
  ceremonyId: string;
  ceremonyExpires: number;
};

type AuthenticationOptionsInput = {
  userId?: string;
  origin: string;
};

type AuthenticateInput = {
  origin: string;
  expectedChallenge: string;
  response: unknown;
  audience: 'staff' | 'member';
  ceremonyId: string;
  ceremonyExpires: number;
};

type RemoveInput = CredentialOwner & {
  id: string;
  rpID: string;
};

type CeremonyTokenInput = {
  challenge: string;
  purpose: CeremonyPurpose;
  subjectId?: string;
};

type VerifyCeremonyInput = {
  purpose: CeremonyPurpose;
  subjectId?: string;
};

function credentialHash(credentialId: string) {
  return crypto.createHash('sha256').update(credentialId).digest('hex');
}

function ceremonyHash(ceremonyId: string) {
  return crypto.createHash('sha256').update(ceremonyId).digest('hex');
}

function isDuplicateCredentialError(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }

  const code = error.code;
  if (code === 'ER_DUP_ENTRY' || code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return true;
  }

  return (
    code === 'SQLITE_CONSTRAINT' &&
    error instanceof Error &&
    error.message.includes('UNIQUE constraint failed: passkey_credentials.credential_id_hash')
  );
}

function isDuplicateCeremonyError(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }

  const code = error.code;
  if (code === 'ER_DUP_ENTRY' || code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return true;
  }

  return (
    code === 'SQLITE_CONSTRAINT' &&
    error instanceof Error &&
    error.message.includes(
      'UNIQUE constraint failed: passkey_ceremony_consumptions.ceremony_id_hash',
    )
  );
}

function decodeTransports(value: unknown): AuthenticatorTransportFuture[] | undefined {
  if (typeof value !== 'string' || !value) {
    return undefined;
  }

  try {
    const transports = transportsSchema.safeParse(JSON.parse(value));
    return transports.success ? transports.data : undefined;
  } catch (error) {
    return undefined;
  }
}

function publicCredential(model: CredentialModel) {
  return {
    id: model.id,
    name: model.get<string>('name'),
    created_at: model.get<Date>('created_at'),
    last_used_at: model.get<Date | null>('last_used_at'),
    device_type: model.get<string>('device_type'),
    backed_up: model.get<boolean>('backed_up'),
  };
}

class PasskeyService {
  private getSecret: () => string;
  private getSiteTitle: () => string | undefined;

  constructor({
    getSecret,
    getSiteTitle,
  }: {
    getSecret: () => string;
    getSiteTitle: () => string | undefined;
  }) {
    this.getSecret = getSecret;
    this.getSiteTitle = getSiteTitle;
  }

  async webAuthn() {
    return import('@simplewebauthn/server');
  }

  relyingParty(origin: string) {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
      throw new errors.IncorrectUsageError({
        message: 'Passkeys require HTTPS outside localhost',
      });
    }

    return {
      origin: parsed.origin,
      rpID: parsed.hostname,
      rpName: this.getSiteTitle() || 'Ghost',
    };
  }

  async credentialsFor({
    userId,
    memberId,
    rpID,
  }: CredentialLookup): Promise<CredentialCollection> {
    const where = userId ? { user_id: userId, rp_id: rpID } : { member_id: memberId, rp_id: rpID };
    return models.PasskeyCredentials.forge().query('where', where).fetch();
  }

  async list(options: CredentialLookup) {
    const credentials = await this.credentialsFor(options);
    return credentials.models.map(publicCredential);
  }

  async hasCredentials(options: CredentialLookup) {
    const credentials = await this.credentialsFor(options);
    return credentials.length > 0;
  }

  async registrationOptions({ userId, memberId, email, name, origin }: RegistrationOptionsInput) {
    const { generateRegistrationOptions } = await this.webAuthn();
    const rp = this.relyingParty(origin);
    const credentials = await this.credentialsFor({
      userId,
      memberId,
      rpID: rp.rpID,
    });
    const subjectId = userId || memberId;
    const options = await generateRegistrationOptions({
      rpName: rp.rpName,
      rpID: rp.rpID,
      userID: new TextEncoder().encode(subjectId),
      userName: email,
      userDisplayName: name || email,
      attestationType: 'none',
      excludeCredentials: credentials.models.map((credential: CredentialModel) => ({
        id: credential.get<string>('credential_id'),
        transports: decodeTransports(credential.get<unknown>('transports')),
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
    });

    return { options, rp };
  }

  async register({
    userId,
    memberId,
    origin,
    expectedChallenge,
    response,
    name,
    ceremonyId,
    ceremonyExpires,
  }: RegisterInput) {
    const parsedResponse = registrationResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      return null;
    }

    const { verifyRegistrationResponse } = await this.webAuthn();
    const rp = this.relyingParty(origin);
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: parsedResponse.data,
        expectedChallenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        requireUserVerification: true,
      });
    } catch (error) {
      return null;
    }

    if (!verification.verified || !verification.registrationInfo) {
      return null;
    }

    const { credential, credentialBackedUp, credentialDeviceType } = verification.registrationInfo;
    const now = new Date();
    let model;
    try {
      model = await db.knex.transaction(async (transaction: typeof db.knex) => {
        let created;
        try {
          created = await models.PasskeyCredential.add(
            {
              user_id: userId || null,
              member_id: memberId || null,
              credential_id: credential.id,
              credential_id_hash: credentialHash(credential.id),
              rp_id: rp.rpID,
              public_key: Buffer.from(credential.publicKey).toString('base64url'),
              counter: credential.counter,
              transports: credential.transports ? JSON.stringify(credential.transports) : null,
              device_type: credentialDeviceType,
              backed_up: credentialBackedUp,
              name:
                String(name || 'Passkey')
                  .trim()
                  .slice(0, 191) || 'Passkey',
            },
            { transacting: transaction },
          );
        } catch (error) {
          if (isDuplicateCredentialError(error)) {
            throw new errors.ConflictError({
              message: 'This passkey is already registered.',
            });
          }
          throw error;
        }

        await transaction('passkey_ceremony_consumptions').where('expires_at', '<=', now).del();
        await transaction('passkey_ceremony_consumptions').insert({
          id: ObjectId().toHexString(),
          passkey_credential_id: created.id,
          ceremony_id_hash: ceremonyHash(ceremonyId),
          expires_at: new Date(ceremonyExpires),
          created_at: now,
        });

        return created;
      });
    } catch (error) {
      if (error instanceof errors.ConflictError) {
        throw error;
      }
      if (isDuplicateCeremonyError(error)) {
        return null;
      }
      throw error;
    }

    return publicCredential(model);
  }

  async authenticationOptions({ userId, origin }: AuthenticationOptionsInput) {
    const { generateAuthenticationOptions } = await this.webAuthn();
    const rp = this.relyingParty(origin);
    const credentials = userId ? await this.credentialsFor({ userId, rpID: rp.rpID }) : null;
    const options = await generateAuthenticationOptions({
      rpID: rp.rpID,
      userVerification: 'required',
      ...(credentials
        ? {
            allowCredentials: credentials.models.map((credential: CredentialModel) => ({
              id: credential.get<string>('credential_id'),
              transports: decodeTransports(credential.get<unknown>('transports')),
            })),
          }
        : {}),
    });

    return { options, rp };
  }

  async authenticate({
    origin,
    expectedChallenge,
    response,
    audience,
    ceremonyId,
    ceremonyExpires,
  }: AuthenticateInput) {
    const parsedResponse = authenticationResponseSchema.safeParse(response);
    if (!parsedResponse.success || !ceremonyId) {
      return null;
    }
    const credential: CredentialModel | null = await models.PasskeyCredential.findOne({
      credential_id_hash: credentialHash(parsedResponse.data.id),
    });
    if (!credential) {
      return null;
    }

    const rp = this.relyingParty(origin);
    if (credential.get<string>('rp_id') !== rp.rpID) {
      return null;
    }
    if (audience === 'staff' && !credential.get<string | null>('user_id')) {
      return null;
    }
    if (audience === 'member' && !credential.get<string | null>('member_id')) {
      return null;
    }

    const { verifyAuthenticationResponse } = await this.webAuthn();
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: parsedResponse.data,
        expectedChallenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        credential: {
          id: credential.get<string>('credential_id'),
          publicKey: Buffer.from(credential.get<string>('public_key'), 'base64url'),
          counter: Number(credential.get<number>('counter')),
          transports: decodeTransports(credential.get<unknown>('transports')),
        },
        requireUserVerification: true,
      });
    } catch (error) {
      return null;
    }

    if (!verification.verified) {
      return null;
    }

    const now = new Date();
    const update = {
      counter: verification.authenticationInfo.newCounter,
      last_used_at: now,
      updated_at: now,
      backed_up: verification.authenticationInfo.credentialBackedUp,
      device_type: verification.authenticationInfo.credentialDeviceType,
    };

    await db.knex('passkey_ceremony_consumptions').where('expires_at', '<=', now).del();
    try {
      await db.knex('passkey_ceremony_consumptions').insert({
        id: ObjectId().toHexString(),
        passkey_credential_id: credential.id,
        ceremony_id_hash: ceremonyHash(ceremonyId),
        expires_at: new Date(ceremonyExpires),
        created_at: now,
      });
    } catch (error) {
      if (isDuplicateCeremonyError(error)) {
        return null;
      }
      throw error;
    }

    const updated = await db
      .knex('passkey_credentials')
      .where({
        id: credential.id,
        counter: Number(credential.get<number>('counter')),
      })
      .update(update);
    if (updated !== 1) {
      return null;
    }

    return {
      userId: credential.get<string | null>('user_id'),
      memberId: credential.get<string | null>('member_id'),
      credential: publicCredential(credential),
    };
  }

  async remove({ id, userId, memberId, rpID }: RemoveInput) {
    const credential: CredentialModel | null = await models.PasskeyCredential.findOne({ id });
    const ownsCredential =
      credential &&
      credential.get<string>('rp_id') === rpID &&
      ((userId && credential.get<string | null>('user_id') === userId) ||
        (memberId && credential.get<string | null>('member_id') === memberId));

    if (!ownsCredential) {
      return false;
    }

    await models.PasskeyCredential.destroy({ id });
    return true;
  }

  createCeremonyToken({ challenge, purpose, subjectId }: CeremonyTokenInput) {
    const issued = Date.now();
    const payload = Buffer.from(
      JSON.stringify({
        id: crypto.randomUUID(),
        challenge,
        purpose,
        subjectId: subjectId || null,
        issued,
        expires: issued + CEREMONY_TTL_MS,
      }),
    ).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.getSecret())
      .update(CEREMONY_HMAC_CONTEXT)
      .update(payload)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  verifyCeremonyToken(
    token: unknown,
    { purpose, subjectId }: VerifyCeremonyInput,
  ): Ceremony | null {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) {
      return null;
    }
    const expected = crypto
      .createHmac('sha256', this.getSecret())
      .update(CEREMONY_HMAC_CONTEXT)
      .update(payload)
      .digest('base64url');
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    } catch (error) {
      return null;
    }

    const parsedCeremony = ceremonySchema.safeParse(decoded);
    if (!parsedCeremony.success) {
      return null;
    }
    const ceremony = parsedCeremony.data;
    if (
      ceremony.purpose !== purpose ||
      ceremony.expires < Date.now() ||
      (subjectId && ceremony.subjectId !== subjectId)
    ) {
      return null;
    }
    return ceremony;
  }
}

module.exports = PasskeyService;
