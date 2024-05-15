import assert from 'assert';
import crypto from 'crypto';
import {HTTPSignature} from './http-signature.service';

describe('HTTPSignature', function () {
    describe('#validate', function () {
        it('returns true when the signature is valid', async function () {
            const requestMethod = 'POST';
            const requestUrl = '/activitypub/inbox/deadbeefdeadbeefdeadbeef';
            const requestHeaders = new Headers({
                host: 'a424-171-97-56-187.ngrok-free.app',
                'user-agent': 'http.rb/5.2.0 (Mastodon/4.3.0-nightly.2024-04-30; +https://mastodon.social/)',
                'content-length': '286',
                'accept-encoding': 'gzip',
                'content-type': 'application/activity+json',
                date: 'Thu, 02 May 2024 09:51:57 GMT',
                digest: 'SHA-256=tbr1NMXoLisaWc4LplxkUO19vrpGSjslPpHN5qGMEaU=',
                signature: 'keyId="https://mastodon.social/users/testingshtuff#main-key",algorithm="rsa-sha256",headers="(request-target) host date digest content-type",signature="rbkHYjeJ6WpO5Pa6Ui3Z/9GzOeB4c/3IMKlXH+ZrBwtAy7DGannGzHXBe+sYWlLOS9U18IQvOcHvsnWkKMs6f63Fbk9kIylxoSOwZqlkWekI5/dfAhEnlz6azW0X3psiW6I/nAqTdAmWYTqszfQVRD19TwgsQXNsPVD/lEfbsopANCGALePY7mPhmf/ukGluy7Ck4sskwDn6eCqoSHSXi7Mav6ZEp5OABX9C626CyvRG5U/IWE2AVjc8hwGghp7NUgxSLiMKk/Tt3xKFd39dDMDJwj8NinCZQTBmvcZurdzChH2ShDsETxZDvPTFrj30jeH2g29kxZhq5rqHP7a6Gw=="',
                'x-forwarded-for': '49.13.137.65',
                'x-forwarded-host': 'a424-171-97-56-187.ngrok-free.app',
                'x-forwarded-proto': 'https'
            });
            const requestBody = Buffer.from('eyJAY29udGV4dCI6Imh0dHBzOi8vd3d3LnczLm9yZy9ucy9hY3Rpdml0eXN0cmVhbXMiLCJpZCI6Imh0dHBzOi8vbWFzdG9kb24uc29jaWFsLzgzMWNlOWMyLWNkYWYtNGJhMC05NmUyLWE3MzY5NDk3MmI5OSIsInR5cGUiOiJGb2xsb3ciLCJhY3RvciI6Imh0dHBzOi8vbWFzdG9kb24uc29jaWFsL3VzZXJzL3Rlc3RpbmdzaHR1ZmYiLCJvYmplY3QiOiJodHRwczovL2E0MjQtMTcxLTk3LTU2LTE4Ny5uZ3Jvay1mcmVlLmFwcC9hY3Rpdml0eXB1Yi9hY3Rvci9kZWFkYmVlZmRlYWRiZWVmZGVhZGJlZWYifQ==', 'base64');

            const actual = await HTTPSignature.validate(requestMethod, requestUrl, requestHeaders, requestBody);
            const expected = true;

            assert.equal(actual, expected, 'The signature should have been validated');
        });
        it('also returns true when the signature is valid', async function () {
            const requestMethod = 'POST';
            const requestUrl = '/activitypub/inbox/deadbeefdeadbeefdeadbeef';
            const requestHeaders = new Headers({
                host: 'a424-171-97-56-187.ngrok-free.app',
                'user-agent': 'http.rb/5.2.0 (Mastodon/4.3.0-nightly.2024-04-30; +https://mastodon.social/)',
                'content-length': '438',
                'accept-encoding': 'gzip',
                'content-type': 'application/activity+json',
                date: 'Thu, 02 May 2024 09:51:30 GMT',
                digest: 'SHA-256=Bru67GlP+0N3ySTtv/D8/QfhCaBc2P9vC1AjCxl5gmA=',
                signature: 'keyId="https://mastodon.social/users/testingshtuff#main-key",algorithm="rsa-sha256",headers="(request-target) host date digest content-type",signature="qx5uo2gRN447a1B+yzjFyc5zy/lYCZqC8tJnIe2Tn6Q+vvVLRZL5hUoZQhFzwlxMPpcpibz2EoFdGlNBf/OFuNBoKa+dsjRA9JyCyc0fd/W2adoA+cp/y1smgSpLFjZUrIViG/SfnVBa3JTw+YeeqX4yY27WYiDMw1hSiQYGWbb64kwayChP6povH5MyoqkjyS1QZWYxOmbn27hlcGuqHgqhEEQhDeqwVEOPzq+JrkuosfIxCPTw/oLX0SWITGUwIffXFquOIV8oB1pWkqfbIXjstrMfFq5n48Ee/5vadsj3rR/dDFLMbUUAwO7uKTsvfurcWmzM4fJKoLyAOxzAgQ=="',
                'x-forwarded-for': '78.47.65.118',
                'x-forwarded-host': 'a424-171-97-56-187.ngrok-free.app',
                'x-forwarded-proto': 'https'
            });
            const requestBody = Buffer.from('eyJAY29udGV4dCI6Imh0dHBzOi8vd3d3LnczLm9yZy9ucy9hY3Rpdml0eXN0cmVhbXMiLCJpZCI6Imh0dHBzOi8vbWFzdG9kb24uc29jaWFsL3VzZXJzL3Rlc3RpbmdzaHR1ZmYjZm9sbG93cy80MjQ3NDc2Ny91bmRvIiwidHlwZSI6IlVuZG8iLCJhY3RvciI6Imh0dHBzOi8vbWFzdG9kb24uc29jaWFsL3VzZXJzL3Rlc3RpbmdzaHR1ZmYiLCJvYmplY3QiOnsiaWQiOiJodHRwczovL21hc3RvZG9uLnNvY2lhbC8yNmY5M2Q2Yy03NmU3LTRiNzAtOWE4Yy03MzMzMTBhMjU4MjQiLCJ0eXBlIjoiRm9sbG93IiwiYWN0b3IiOiJodHRwczovL21hc3RvZG9uLnNvY2lhbC91c2Vycy90ZXN0aW5nc2h0dWZmIiwib2JqZWN0IjoiaHR0cHM6Ly9hNDI0LTE3MS05Ny01Ni0xODcubmdyb2stZnJlZS5hcHAvYWN0aXZpdHlwdWIvYWN0b3IvZGVhZGJlZWZkZWFkYmVlZmRlYWRiZWVmIn19', 'base64');

            const actual = await HTTPSignature.validate(requestMethod, requestUrl, requestHeaders, requestBody);
            const expected = true;

            assert.equal(actual, expected, 'The signature should have been validated');
        });
    });

    describe('#sign', function () {
        it('Can sign a request that does not have explicit Date or Host headers', async function () {
            const keypair = crypto.generateKeyPairSync('rsa', {
                modulusLength: 512
            });
            const request = new Request('https://example.com:2368/blah');
            const signed = await HTTPSignature.sign(request, new URL('https://keyid.com'), keypair.privateKey);

            assert.ok(signed);
        });

        it('Can sign a post request which is valid', async function () {
            const keypair = crypto.generateKeyPairSync('rsa', {
                modulusLength: 512
            });
            class MockHTTPSignature extends HTTPSignature {
                protected static async getPublicKey() {
                    return keypair.publicKey;
                }
            }

            const request = new Request('https://example.com:2368/blah', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/ld+json'
                },
                body: JSON.stringify({
                    id: 'https://mastodon.social/users/testingshtuff',
                    type: 'Accept',
                    actor: 'https://mastodon.social/users/testingshtuff',
                    object: 'https://mastodon.social/79f89120-fd13-43e8-aa6d-3bd03652cfad'
                })
            });

            const signed = await MockHTTPSignature.sign(request, new URL('https://keyid.com'), keypair.privateKey);

            assert.ok(signed);

            const url = new URL(signed.url);
            const body = Buffer.from(await signed.text());
            const result = await MockHTTPSignature.validate(signed.method, url.pathname, signed.headers, body);

            assert.equal(result, true);
        });
    });
});
