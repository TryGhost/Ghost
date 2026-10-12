import assert from 'node:assert/strict';
import { generateKeyPairSync, type KeyPairKeyObjectResult } from 'node:crypto';
import { setImmediate } from 'node:timers/promises';
import { decode, verify, type JwtPayload, type VerifyOptions } from 'jsonwebtoken';
import sinon from 'sinon';
import type { IdentityTokenService } from '../../../../../core/server/services/identity-tokens/identity-token-service';

type SigningKeys = typeof import('../../../../../core/server/services/signing-keys').default;
type IdentityTokensRoot = {
  init(): Promise<void>;
  instance: IdentityTokenService | undefined;
};
type IdentitiesController = {
  read: { query(frame: { user: unknown }): Promise<{ token: string }> };
};

// Use the CommonJS copy that the signing-keys root requires, so prototype stubs reach it.
const {
  SigningKeyService,
}: typeof import('../../../../../core/server/services/signing-keys/signing-key-service') = require('../../../../../core/server/services/signing-keys/signing-key-service');
const SIGNING_KEYS_PATH = require.resolve('../../../../../core/server/services/signing-keys');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const identities: IdentitiesController = require('../../../../../core/server/api/endpoints/identities');
const rootPaths = [
  SIGNING_KEYS_PATH,
  require.resolve('../../../../../core/server/services/identity-tokens'),
  require.resolve('../../../../../core/server/services/identity-tokens/identity-token-service-wrapper'),
];

function claimsOf(token: string, key: KeyPairKeyObjectResult, options: VerifyOptions = {}) {
  return verify(token, key.publicKey, { ...options, algorithms: ['RS256'] }) as JwtPayload;
}

function kidOf(token: string) {
  return decode(token, { complete: true })?.header.kid;
}

describe('Identity tokens root', function () {
  const sandbox = sinon.createSandbox();
  let originalModules: Map<string, NodeJS.Module | undefined>;
  let root: IdentityTokensRoot;
  let getSigningKey: sinon.SinonStub;
  let forPurpose: sinon.SinonStub;
  let signingKeys: SigningKeys;
  let check: sinon.SinonStub;
  let keys: KeyPairKeyObjectResult[];

  beforeAll(function () {
    keys = [0, 1].map(() => generateKeyPairSync('rsa', { modulusLength: 2048 }));
  });

  beforeEach(function () {
    originalModules = new Map(rootPaths.map((path) => [path, require.cache[path]]));
    rootPaths.forEach((path) => delete require.cache[path]);
    getSigningKey = sandbox.stub().resolves({ privateKey: keys[0].privateKey, kid: 'first' });
    forPurpose = sandbox.stub(SigningKeyService.prototype, 'forPurpose').returns({ getSigningKey });
    check = sandbox.stub(SigningKeyService.prototype, 'check').resolves();
    signingKeys = require(SIGNING_KEYS_PATH).default;
    sandbox
      .stub(urlUtils, 'urlFor')
      .withArgs('admin', true)
      .returns('https://example.com/blog/ghost/');
    root = require(rootPaths[1]);
  });

  afterEach(function () {
    sandbox.restore();
    for (const [path, previous] of originalModules) {
      delete require.cache[path];
      if (previous) {
        require.cache[path] = previous;
      }
    }
  });

  it('does not obtain signing keys or publish an instance merely by importing', async function () {
    // Initialize signing keys first so an import-time init would be able to succeed.
    await signingKeys.init();
    check.resetHistory();
    rootPaths.slice(1).forEach((path) => delete require.cache[path]);
    root = require(rootPaths[1]);
    await setImmediate();

    assert.equal(root.instance, undefined);
    sinon.assert.notCalled(check);
    sinon.assert.notCalled(forPurpose);
    sinon.assert.notCalled(getSigningKey);
  });

  it('signs an identities endpoint response with the staff provider and configured admin issuer', async function () {
    await signingKeys.init();
    await root.init();
    const user = {
      load: sandbox.stub().resolves(),
      get: sandbox.stub().withArgs('email').returns('staff@example.com'),
      relations: { roles: { toJSON: () => [{ name: 'Editor' }] } },
    };

    const { token } = await identities.read.query({ user });
    const claims = claimsOf(token, keys[0], { issuer: 'https://example.com/blog/ghost/' });

    assert.equal(claims.sub, 'staff@example.com');
    assert.equal(claims.role, 'Editor');
    assert.equal(claims.exp! - claims.iat!, 300);
    assert.equal(kidOf(token), 'first');
    sinon.assert.calledOnceWithExactly(forPurpose, 'staff');
    sinon.assert.calledOnceWithExactly(user.load, ['roles']);
  });

  it('retains the initialized instance and issuer while asking its provider for the current key', async function () {
    await signingKeys.init();
    await root.init();
    const retained = root.instance!;
    const firstToken = await retained.getTokenForUser('staff@example.com');
    assert.equal(claimsOf(firstToken, keys[0]).sub, 'staff@example.com');
    assert.equal(kidOf(firstToken), 'first');
    urlUtils.urlFor.withArgs('admin', true).returns('https://changed.example/ghost/');
    assert.equal(urlUtils.urlFor('admin', true), 'https://changed.example/ghost/');
    getSigningKey.resolves({ privateKey: keys[1].privateKey, kid: 'rotated' });
    await root.init();

    const token = await retained.getTokenForUser('staff@example.com');
    const claims = claimsOf(token, keys[1], { issuer: 'https://example.com/blog/ghost/' });

    assert.equal(root.instance, retained);
    assert.equal(claims.sub, 'staff@example.com');
    assert.equal(claims.role, undefined);
    assert.equal(kidOf(token), 'rotated');
    sinon.assert.calledOnce(check);
    sinon.assert.calledOnce(forPurpose);
    sinon.assert.calledTwice(getSigningKey);
  });

  it('can retry after signing keys are initialized, without publishing early', async function () {
    await assert.rejects(root.init(), /Signing keys used before init/);
    assert.equal(root.instance, undefined);
    await signingKeys.init();
    await root.init();

    const token = await root.instance!.getTokenForUser('staff@example.com');
    assert.equal(claimsOf(token, keys[0]).sub, 'staff@example.com');
  });

  it('can retry after selecting the staff provider fails', async function () {
    await signingKeys.init();
    const failure = new Error('Staff signing keys are unavailable');
    forPurpose.onFirstCall().throws(failure);

    await assert.rejects(root.init(), (error) => error === failure);
    assert.equal(root.instance, undefined);
    await root.init();

    const token = await root.instance!.getTokenForUser('staff@example.com');
    assert.equal(claimsOf(token, keys[0]).sub, 'staff@example.com');
  });

  it('propagates key lookup failures without replacing the usable service', async function () {
    await signingKeys.init();
    await root.init();
    const retained = root.instance!;
    const failure = new Error('Key lookup failed');
    getSigningKey.onFirstCall().rejects(failure);

    await assert.rejects(
      retained.getTokenForUser('staff@example.com'),
      (error) => error === failure,
    );
    const token = await retained.getTokenForUser('staff@example.com');

    assert.equal(root.instance, retained);
    assert.equal(claimsOf(token, keys[0]).sub, 'staff@example.com');
  });
});
