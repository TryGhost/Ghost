import assert from 'node:assert/strict';

import { FlattenedSign } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  readSignedManifest,
  signManifest,
  verifySignedManifest,
  type SignedManifest,
} from '../../src/identity/index.ts';
import { encode, newKeyPair, type KeyPair } from './helpers.ts';

const MANIFEST = { id: 'com.example.podcast', name: 'Podcast' };

let identity: KeyPair;
let other: KeyPair;

beforeAll(async () => {
  identity = await newKeyPair();
  other = await newKeyPair();
});

function read(body: unknown) {
  const result = readSignedManifest(body);
  assert(result.success, `Expected the signed manifest to be read: ${JSON.stringify(result)}`);
  return result;
}

describe('signManifest', () => {
  it('signs a manifest as flattened JWS JSON, typed as a manifest', async () => {
    const signed = await signManifest(MANIFEST, identity.privateKey);

    expect(Object.keys(signed).sort()).toEqual(['payload', 'protected', 'signature']);
    expect(JSON.parse(Buffer.from(signed.protected, 'base64url').toString())).toEqual({
      alg: 'Ed25519',
      typ: 'ghost-app-manifest',
    });
    expect(read(signed).payload).toBe(JSON.stringify(MANIFEST));
  });

  it('signs text as its exact bytes', async () => {
    const text = '{ "id" : "com.example.podcast" }\n';
    expect(read(await signManifest(text, identity.privateKey)).payload).toBe(text);
  });
});

describe('readSignedManifest', () => {
  it('reads the manifest’s text out of a signed manifest', async () => {
    const signed = await signManifest(MANIFEST, identity.privateKey);
    expect(read(signed)).toEqual({ success: true, signed, payload: JSON.stringify(MANIFEST) });
  });

  it.each([
    ['a plain manifest', MANIFEST],
    ['a compact JWS', 'eyJhbGciOiJFZDI1NTE5In0.e30.c2ln'],
    ['a JWS with an unprotected header', { protected: '', payload: '', signature: '', header: {} }],
    ['nothing', null],
  ])('refuses %s', (_, body) => {
    expect(readSignedManifest(body)).toEqual({
      success: false,
      error: 'Expected a signed manifest: flattened JWS JSON with protected, payload and signature',
    });
  });

  it.each([
    ['another type', { alg: 'Ed25519', typ: 'JWT' }],
    ['no type', { alg: 'Ed25519' }],
    ['another algorithm', { alg: 'ES256', typ: 'ghost-app-manifest' }],
    ['the old name of the algorithm', { alg: 'EdDSA', typ: 'ghost-app-manifest' }],
    ['anything more', { alg: 'Ed25519', typ: 'ghost-app-manifest', kid: 'main' }],
    ['a header that isn’t JSON', encode('alg')],
    ['a header that isn’t UTF-8', Buffer.from([0xff]).toString('base64url')],
  ])('refuses a protected header with %s', async (_, header) => {
    const signed = await signManifest(MANIFEST, identity.privateKey);
    const encoded = typeof header === 'string' ? header : encode(header);
    expect(readSignedManifest({ ...signed, protected: encoded })).toEqual({
      success: false,
      error: 'Expected a protected header of {"alg":"Ed25519","typ":"ghost-app-manifest"}',
    });
  });

  it('refuses a payload that isn’t UTF-8 text', async () => {
    const signed = await signManifest(MANIFEST, identity.privateKey);
    expect(
      readSignedManifest({ ...signed, payload: Buffer.from([0xff, 0xfe]).toString('base64url') }),
    ).toEqual({ success: false, error: 'Expected a payload of UTF-8 text in base64url' });
  });
});

describe('verifySignedManifest', () => {
  it('accepts a manifest signed with the identity key', async () => {
    const { signed } = read(await signManifest(MANIFEST, identity.privateKey));
    expect(await verifySignedManifest(signed, identity.publicJwk)).toEqual({ success: true });
  });

  it('refuses a manifest signed with another key', async () => {
    const { signed } = read(await signManifest(MANIFEST, other.privateKey));
    expect(await verifySignedManifest(signed, identity.publicJwk)).toEqual({
      success: false,
      error: 'The signature was not made with identity_key',
    });
  });

  it('refuses a manifest changed after it was signed', async () => {
    const { signed } = read(await signManifest(MANIFEST, identity.privateKey));
    const changed: SignedManifest = { ...signed, payload: encode({ ...MANIFEST, name: 'Evil' }) };
    expect((await verifySignedManifest(changed, identity.publicJwk)).success).toBe(false);
  });

  // The type stops anything else the identity key signs from passing as a manifest.
  it('refuses a signature made for something other than a manifest', async () => {
    const jws = await new FlattenedSign(new TextEncoder().encode(JSON.stringify(MANIFEST)))
      .setProtectedHeader({ alg: 'Ed25519', typ: 'JWT' })
      .sign(identity.privateKey);
    const signed = { protected: jws.protected!, payload: jws.payload, signature: jws.signature };
    expect(await verifySignedManifest(signed, identity.publicJwk)).toEqual({
      success: false,
      error: 'Expected a protected header of {"alg":"Ed25519","typ":"ghost-app-manifest"}',
    });
  });

  // A caller may verify without reading first, so the header is held to here too.
  it.each([
    { name: 'another member', header: { kid: 'other' } },
    { name: 'an unencoded payload', header: { b64: false, crit: ['b64'] } },
  ])('refuses a header with $name, though validly signed', async ({ header }) => {
    const payload = JSON.stringify(MANIFEST);
    const jws = await new FlattenedSign(new TextEncoder().encode(payload))
      .setProtectedHeader({ alg: 'Ed25519', typ: 'ghost-app-manifest', ...header })
      .sign(identity.privateKey);
    const signed = { protected: jws.protected!, payload: jws.payload, signature: jws.signature };
    expect(await verifySignedManifest(signed, identity.publicJwk)).toEqual({
      success: false,
      error: 'Expected a protected header of {"alg":"Ed25519","typ":"ghost-app-manifest"}',
    });
  });

  // A manifest's keys are checked when it is parsed, but this may be handed any key.
  it('refuses a key that isn’t an Ed25519 public key', async () => {
    const { signed } = read(await signManifest(MANIFEST, identity.privateKey));
    const notAKey = { ...identity.publicJwk, x: 'AQAB' };
    expect(await verifySignedManifest(signed, notAKey)).toEqual({
      success: false,
      error: 'identity_key is not a usable Ed25519 key',
    });
  });
});
