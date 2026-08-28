export {};

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sinon = require('sinon');
const PasskeyService = require('../../../../../core/server/services/passkeys/passkey-service');
const db = require('../../../../../core/server/data/db');
const models = require('../../../../../core/server/models');

const registrationResponse = {
  id: 'credential-id',
  rawId: 'credential-id',
  response: {
    clientDataJSON: 'client-data',
    attestationObject: 'attestation',
  },
  clientExtensionResults: {},
  type: 'public-key',
};

const authenticationResponse = {
  id: 'credential-id',
  rawId: 'credential-id',
  response: {
    clientDataJSON: 'client-data',
    authenticatorData: 'authenticator-data',
    signature: 'signature',
  },
  clientExtensionResults: {},
  type: 'public-key',
};

describe('PasskeyService', function () {
  let clock: ReturnType<typeof sinon.useFakeTimers>;
  let service: any;

  beforeEach(function () {
    clock = sinon.useFakeTimers({ now: new Date('2026-08-25T12:00:00Z') });
    service = new PasskeyService({
      getSecret: () => 'test-secret',
      getSiteTitle: () => 'Test site',
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('creates a short-lived ceremony token bound to its purpose and subject', function () {
    const token = service.createCeremonyToken({
      challenge: 'challenge',
      purpose: 'member-registration',
      subjectId: 'member-id',
    });

    const ceremony = service.verifyCeremonyToken(token, {
      purpose: 'member-registration',
      subjectId: 'member-id',
    });

    assert.equal(ceremony.challenge, 'challenge');
    assert.equal(typeof ceremony.id, 'string');
    assert.ok(ceremony.id.length > 0);
    assert.equal(ceremony.issued, clock.now);
    assert.equal(ceremony.expires, clock.now + 5 * 60 * 1000);
  });

  it('creates a unique identifier for each ceremony', function () {
    const first = service.verifyCeremonyToken(
      service.createCeremonyToken({
        challenge: 'challenge',
        purpose: 'member-authentication',
      }),
      { purpose: 'member-authentication' },
    );
    const second = service.verifyCeremonyToken(
      service.createCeremonyToken({
        challenge: 'challenge',
        purpose: 'member-authentication',
      }),
      { purpose: 'member-authentication' },
    );

    assert.notEqual(first.id, second.id);
  });

  it('rejects tampered, mismatched and expired ceremony tokens', function () {
    const token = service.createCeremonyToken({
      challenge: 'challenge',
      purpose: 'member-registration',
      subjectId: 'member-id',
    });

    assert.equal(
      service.verifyCeremonyToken(`${token}tampered`, {
        purpose: 'member-registration',
        subjectId: 'member-id',
      }),
      null,
    );
    const [payload, signature] = token.split('.');
    const legacySignature = crypto
      .createHmac('sha256', 'test-secret')
      .update(payload)
      .digest('base64url');
    assert.equal(
      service.verifyCeremonyToken(`${payload}.${legacySignature}`, {
        purpose: 'member-registration',
        subjectId: 'member-id',
      }),
      null,
    );
    const changedSignature = `${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;
    assert.equal(
      service.verifyCeremonyToken(`${payload}.${changedSignature}`, {
        purpose: 'member-registration',
        subjectId: 'member-id',
      }),
      null,
    );
    const changedPayload = `${payload.slice(0, -1)}${payload.endsWith('a') ? 'b' : 'a'}`;
    assert.equal(
      service.verifyCeremonyToken(`${changedPayload}.${signature}`, {
        purpose: 'member-registration',
        subjectId: 'member-id',
      }),
      null,
    );
    assert.equal(
      service.verifyCeremonyToken(token, {
        purpose: 'member-authentication',
        subjectId: 'member-id',
      }),
      null,
    );
    assert.equal(
      service.verifyCeremonyToken(token, {
        purpose: 'member-registration',
        subjectId: 'another-member',
      }),
      null,
    );

    clock.tick(5 * 60 * 1000 + 1);
    assert.equal(
      service.verifyCeremonyToken(token, {
        purpose: 'member-registration',
        subjectId: 'member-id',
      }),
      null,
    );
  });

  it('excludes credentials already registered to the account', async function () {
    const generateRegistrationOptions = sinon.stub().resolves({ challenge: 'challenge' });
    sinon.stub(service, 'webAuthn').resolves({ generateRegistrationOptions });
    sinon.stub(service, 'credentialsFor').resolves({
      models: [
        {
          get: sinon.stub().callsFake((key: string) => {
            return (
              {
                credential_id: 'existing-credential',
                transports: '["internal"]',
              } as Record<string, unknown>
            )[key];
          }),
        },
      ],
    });

    await service.registrationOptions({
      memberId: 'member-id',
      email: 'member@example.com',
      name: 'Member',
      origin: 'https://example.com',
    });

    sinon.assert.calledWithMatch(generateRegistrationOptions, {
      excludeCredentials: [{ id: 'existing-credential', transports: ['internal'] }],
    });
  });

  it('returns a conflict when a duplicate credential reaches persistence', async function () {
    sinon.stub(service, 'webAuthn').resolves({
      verifyRegistrationResponse: sinon.stub().resolves({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'existing-credential',
            publicKey: Buffer.from('public-key'),
            counter: 0,
          },
          credentialBackedUp: true,
          credentialDeviceType: 'multiDevice',
        },
      }),
    });
    const sqliteUniqueError = Object.assign(
      new Error('UNIQUE constraint failed: passkey_credentials.credential_id_hash'),
      { code: 'SQLITE_CONSTRAINT' },
    );
    sinon
      .stub(db.knex, 'transaction')
      .callsFake(async (callback: (transaction: typeof db.knex) => unknown) => callback(db.knex));
    const add = sinon.stub(models.PasskeyCredential, 'add');
    add.onFirstCall().rejects({ code: 'ER_DUP_ENTRY' });
    add.onSecondCall().rejects(sqliteUniqueError);

    for (const database of ['MySQL', 'SQLite']) {
      await assert.rejects(
        service.register({
          memberId: 'member-id',
          origin: 'https://example.com',
          expectedChallenge: 'challenge',
          response: registrationResponse,
          name: `Duplicate on ${database}`,
          ceremonyId: `ceremony-${database}`,
          ceremonyExpires: clock.now + 5 * 60 * 1000,
        }),
        /This passkey is already registered/,
      );
    }
  });

  it('atomically rejects a replayed registration ceremony', async function () {
    const verifyRegistrationResponse = sinon.stub();
    verifyRegistrationResponse.onFirstCall().resolves({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'credential-a',
          publicKey: Buffer.from('public-key-a'),
          counter: 0,
        },
        credentialBackedUp: true,
        credentialDeviceType: 'multiDevice',
      },
    });
    verifyRegistrationResponse.onSecondCall().resolves({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'credential-b',
          publicKey: Buffer.from('public-key-b'),
          counter: 0,
        },
        credentialBackedUp: true,
        credentialDeviceType: 'multiDevice',
      },
    });
    sinon.stub(service, 'webAuthn').resolves({ verifyRegistrationResponse });

    const model = {
      id: 'credential-model-id',
      get: sinon.stub().callsFake((key: string) => {
        return (
          {
            name: 'Passkey',
            created_at: new Date(),
            last_used_at: null,
            device_type: 'multiDevice',
            backed_up: true,
          } as Record<string, unknown>
        )[key];
      }),
    };
    sinon.stub(models.PasskeyCredential, 'add').resolves(model);

    const consumptionQuery = {
      where: sinon.stub(),
      del: sinon.stub().resolves(0),
      insert: sinon.stub(),
    };
    consumptionQuery.where.returns(consumptionQuery);
    consumptionQuery.insert.onFirstCall().resolves();
    consumptionQuery.insert
      .onSecondCall()
      .rejects(
        Object.assign(
          new Error('UNIQUE constraint failed: passkey_ceremony_consumptions.ceremony_id_hash'),
          { code: 'SQLITE_CONSTRAINT' },
        ),
      );
    const transaction = sinon.stub();
    transaction.withArgs('passkey_ceremony_consumptions').returns(consumptionQuery);
    sinon
      .stub(db.knex, 'transaction')
      .callsFake(async (callback: (trx: typeof transaction) => unknown) => callback(transaction));

    const input = {
      memberId: 'member-id',
      origin: 'https://example.com',
      expectedChallenge: 'challenge',
      response: registrationResponse,
      name: 'Passkey',
      ceremonyId: 'registration-ceremony',
      ceremonyExpires: clock.now + 5 * 60 * 1000,
    };

    assert.equal((await service.register(input)).id, 'credential-model-id');
    assert.equal(await service.register(input), null);
    assert.equal(consumptionQuery.insert.callCount, 2);
  });

  it('rejects malformed WebAuthn payloads before verification', async function () {
    const webAuthn = sinon.spy(service, 'webAuthn');

    assert.equal(
      await service.register({
        memberId: 'member-id',
        origin: 'https://example.com',
        expectedChallenge: 'challenge',
        response: { id: 'incomplete-registration' },
        name: 'Invalid',
        ceremonyId: 'ceremony-id',
        ceremonyExpires: clock.now + 5 * 60 * 1000,
      }),
      null,
    );
    assert.equal(
      await service.authenticate({
        origin: 'https://example.com',
        expectedChallenge: 'challenge',
        response: { id: 'incomplete-authentication' },
        audience: 'member',
        ceremonyId: 'ceremony-id',
        ceremonyExpires: clock.now + 5 * 60 * 1000,
      }),
      null,
    );
    sinon.assert.notCalled(webAuthn);
  });

  it('returns null when a WebAuthn verifier rejects', async function () {
    const credential = {
      id: 'credential-model-id',
      get: sinon.stub().callsFake((key: string) => {
        return (
          {
            credential_id: 'credential-id',
            rp_id: 'example.com',
            public_key: Buffer.from('public-key').toString('base64url'),
            counter: 0,
            user_id: 'user-id',
            member_id: null,
          } as Record<string, unknown>
        )[key];
      }),
    };
    sinon.stub(models.PasskeyCredential, 'findOne').resolves(credential);
    sinon.stub(service, 'webAuthn').resolves({
      verifyRegistrationResponse: sinon.stub().rejects(new Error('Invalid registration response')),
      verifyAuthenticationResponse: sinon
        .stub()
        .rejects(new Error('Invalid authentication response')),
    });

    assert.equal(
      await service.register({
        memberId: 'member-id',
        origin: 'https://example.com',
        expectedChallenge: 'challenge',
        response: registrationResponse,
        name: 'Rejected',
        ceremonyId: 'ceremony-id',
        ceremonyExpires: clock.now + 5 * 60 * 1000,
      }),
      null,
    );
    assert.equal(
      await service.authenticate({
        origin: 'https://example.com',
        expectedChallenge: 'challenge',
        response: authenticationResponse,
        audience: 'staff',
        ceremonyId: 'ceremony-id',
        ceremonyExpires: clock.now + 5 * 60 * 1000,
      }),
      null,
    );
  });

  it('rejects a consumed zero-counter ceremony after another ceremony succeeds', async function () {
    const credential = {
      id: 'credential-model-id',
      get: sinon.stub().callsFake((key: string) => {
        return (
          {
            credential_id: 'credential-id',
            rp_id: 'example.com',
            public_key: Buffer.from('public-key').toString('base64url'),
            counter: 0,
            user_id: 'user-id',
            member_id: null,
          } as Record<string, unknown>
        )[key];
      }),
    };
    sinon.stub(models.PasskeyCredential, 'findOne').resolves(credential);
    sinon.stub(service, 'webAuthn').resolves({
      verifyAuthenticationResponse: sinon.stub().resolves({
        verified: true,
        authenticationInfo: {
          newCounter: 0,
          credentialBackedUp: true,
          credentialDeviceType: 'multiDevice',
        },
      }),
    });

    const consumedCeremonies = new Set();
    const consumptionQuery = {
      where: sinon.stub(),
      del: sinon.stub().resolves(0),
      insert: sinon.stub(),
    };
    consumptionQuery.where.returns(consumptionQuery);
    consumptionQuery.insert.callsFake(async (consumption: { ceremony_id_hash: string }) => {
      if (consumedCeremonies.has(consumption.ceremony_id_hash)) {
        throw Object.assign(
          new Error('UNIQUE constraint failed: passkey_ceremony_consumptions.ceremony_id_hash'),
          { code: 'SQLITE_CONSTRAINT' },
        );
      }
      consumedCeremonies.add(consumption.ceremony_id_hash);
    });
    const credentialQuery = {
      where: sinon.stub(),
      update: sinon.stub().resolves(1),
    };
    credentialQuery.where.returns(credentialQuery);
    const knex = sinon.stub();
    knex.withArgs('passkey_ceremony_consumptions').returns(consumptionQuery);
    knex.withArgs('passkey_credentials').returns(credentialQuery);
    sinon.stub(db, 'knex').get(() => knex);

    const authentication = (ceremonyId: string) => ({
      origin: 'https://example.com',
      expectedChallenge: 'challenge',
      response: authenticationResponse,
      audience: 'staff',
      ceremonyId,
      ceremonyExpires: clock.now + 5 * 60 * 1000,
    });

    assert.equal((await service.authenticate(authentication('ceremony-a'))).userId, 'user-id');
    assert.equal((await service.authenticate(authentication('ceremony-b'))).userId, 'user-id');
    assert.equal(await service.authenticate(authentication('ceremony-a')), null);
    assert.equal(consumedCeremonies.size, 2);
    assert.equal(credentialQuery.update.callCount, 2);
    sinon.assert.calledWith(credentialQuery.where, {
      id: 'credential-model-id',
      counter: 0,
    });
  });

  it('rejects authentication when another request advances the credential counter', async function () {
    const credential = {
      id: 'credential-model-id',
      get: sinon.stub().callsFake((key: string) => {
        return (
          {
            credential_id: 'credential-id',
            rp_id: 'example.com',
            public_key: Buffer.from('public-key').toString('base64url'),
            counter: 5,
            user_id: 'user-id',
            member_id: null,
          } as Record<string, unknown>
        )[key];
      }),
    };
    sinon.stub(models.PasskeyCredential, 'findOne').resolves(credential);
    sinon.stub(service, 'webAuthn').resolves({
      verifyAuthenticationResponse: sinon.stub().resolves({
        verified: true,
        authenticationInfo: {
          newCounter: 6,
          credentialBackedUp: true,
          credentialDeviceType: 'multiDevice',
        },
      }),
    });

    const consumptionQuery = {
      where: sinon.stub(),
      del: sinon.stub().resolves(0),
      insert: sinon.stub().resolves(),
    };
    consumptionQuery.where.returns(consumptionQuery);
    const credentialQuery = {
      where: sinon.stub(),
      update: sinon.stub().resolves(0),
    };
    credentialQuery.where.returns(credentialQuery);
    const knex = sinon.stub();
    knex.withArgs('passkey_ceremony_consumptions').returns(consumptionQuery);
    knex.withArgs('passkey_credentials').returns(credentialQuery);
    sinon.stub(db, 'knex').get(() => knex);

    assert.equal(
      await service.authenticate({
        origin: 'https://example.com',
        expectedChallenge: 'challenge',
        response: authenticationResponse,
        audience: 'staff',
        ceremonyId: 'second-ceremony',
        ceremonyExpires: clock.now + 5 * 60 * 1000,
      }),
      null,
    );
    sinon.assert.calledWith(credentialQuery.where, {
      id: 'credential-model-id',
      counter: 5,
    });
  });

  it('rejects credentials that do not belong to the relying party or audience', async function () {
    const values: Record<string, string | number | null> = {
      credential_id: 'credential-id',
      rp_id: 'other.example.com',
      public_key: Buffer.from('public-key').toString('base64url'),
      counter: 0,
      user_id: 'user-id',
      member_id: null,
    };
    const credential = {
      id: 'credential-model-id',
      get: sinon.stub().callsFake((key: string) => values[key]),
    };
    sinon.stub(models.PasskeyCredential, 'findOne').resolves(credential);

    const input = {
      origin: 'https://example.com',
      expectedChallenge: 'challenge',
      response: authenticationResponse,
      audience: 'staff',
      ceremonyId: 'ceremony-id',
      ceremonyExpires: clock.now + 5 * 60 * 1000,
    };

    assert.equal(await service.authenticate(input), null);

    values.rp_id = 'example.com';
    values.user_id = null;
    values.member_id = 'member-id';
    assert.equal(await service.authenticate(input), null);

    values.user_id = 'user-id';
    values.member_id = null;
    assert.equal(await service.authenticate({ ...input, audience: 'member' }), null);
  });
});
