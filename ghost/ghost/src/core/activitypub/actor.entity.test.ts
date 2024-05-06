import crypto from 'node:crypto';
import {Actor} from './actor.entity';
import {HTTPSignature} from './http-signature.service';
import assert from 'node:assert';

describe('Actor', function () {
    describe('#sign', function () {
        it('returns a request with a valid Signature header', async function () {
            const keypair = crypto.generateKeyPairSync('rsa', {
                modulusLength: 512
            });
            const baseUrl = new URL('https://example.com/ap');
            const actor = Actor.create({
                username: 'Testing',
                outbox: [],
                publicKey: keypair.publicKey
                    .export({type: 'pkcs1', format: 'pem'})
                    .toString(),
                privateKey: keypair.privateKey
                    .export({type: 'pkcs1', format: 'pem'})
                    .toString()
            });

            const url = new URL('https://some-server.com/users/username/inbox');
            const date = new Date();
            const request = new Request(url, {
                headers: {
                    Host: url.host,
                    Date: date.toISOString(),
                    Accept: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
                }
            });

            const signedRequest = await actor.sign(request, baseUrl);

            const publicKey = actor.getJSONLD(baseUrl).publicKey;

            class MockHTTPSignature extends HTTPSignature {
                protected static async getPublicKey() {
                    return crypto.createPublicKey(publicKey.publicKeyPem);
                }
            }

            const signedRequestURL = new URL(signedRequest.url);

            const actual = await MockHTTPSignature.validate(
                signedRequest.method,
                signedRequestURL.pathname,
                signedRequest.headers
            );

            const expected = true;

            assert.equal(actual, expected, 'The signature should have been valid');
        });
    });
});
