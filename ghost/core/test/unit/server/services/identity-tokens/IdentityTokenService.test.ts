import assert from 'assert/strict';
import {IdentityTokenService} from '../../../../../core/server/services/identity-tokens/IdentityTokenService';
import {JWK} from 'node-jose';
import {verify} from 'jsonwebtoken';

describe('IdentityTokenService', function () {
    it('Can create JWTs', async function () {
        const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCYhlD7QVSExM/t
qtFuJh5tJVMInFMNdoYVTFC+1uEMJnaNfSgvI1fpBSbhBc9Dirg76RNh1uUbX/fm
tpanZ2TULkh4e7MqOI4gIyrsyxT5ouRGYFEdXMGGLBfffwTC8e6ndoKyRq6hF1PO
UOgcSAEh5UalRsftfLNpmDJNjIKKkfRoHovyVhwi5QBaD7VjTdDR1ip0CSA1Xn5l
MxHc3mLnshAqaLu4aDcyFE8z70IyhwUcRYkYniZG6HlbaTyOL/tDCmVCjt3rvMGh
TzAOhxdB5UKzV/9gC4rpKgaK2BSh+e5FT9UMEgXmRQXuxKMuCb5iF5l326LgYwtX
tsqrc6ePAgMBAAECggEAQA2kQ6gfePR4R9zFQAdVHsweb07LGCvOynH2tPZjo2kh
v3Cwp/8lQ5As0DJS5RAEJ/DNeXi4VYM7hhHm+d2TfAIF4Ec+qjv+/+MU+0WcBOxS
BnYbioOyKAkra2oZ006rxXshDwJdAvzbbpkOqRXaF+SEAxPTEVqds/o9IdEg31Uf
OS/ZjH2XbtsVOTMbXB21RrgthdjYbcqZzVRD8gClOgo7i6nskZGZRFbmb96qBpCX
hkpRLEQJbOhmCHqkGStInjS41PIfzjYu5JjfDaFJQqnOpwWcmhj8SNej1ocEpTcU
7xH+M/tyW1v88qFZiPm8St7bSL9HqWz4S/bNBwlyuQKBgQDJgcPPDLCI8woSexAG
I4sHxaGGl4mmGlH321HEHNcQft2JWBBpXGqi+F8VsG7wUsGHdRiM6bqseg3b7szr
iodeyl6WL/4nrQdZP/5RCARgNCIP9scKWGSlPkBh60xKD4+g0p1hL6kCrzB8SXYr
NnIlMWcw8uV/D4eYb9qGtY1O1wKBgQDBxYiSyT0eum2yTnIva+CORIRoRpsXK0/y
StC/ydYPI7Ozb+rB5ep+b/F7UuQJjY8o+TPKGmxh608Do62sHDAPtR948aNxV1M5
mIIoiPciJsc32D2Gv+UVUhpTSO1ncaJ8mumngfdC+CSosDWxTZiGq4JU+ww+5402
R34gEVDuCQKBgE2Vgd+pQhsogFtHOI80hiYy6JMaq2vhvGeS8PNyKzf1sLRdzMvU
QlaHDI0cRkqPgmX2JsKyhyY7RDTGx+10g9RyVGK9Db0W+LpbUj6+uHiV+ftth4sr
J20b/8vzvYbSYPmJvgCaShd3flKMMkxHBUHeuJ13F/eI8is1/cxaAJM3AoGBAJHq
NREL9zmXe5mE1xl8q8mWMPrxCELnO7mhuxZhYA9gfCbIRUij4PQ7SeXrIotLDR32
opgzU6Bc+NAtxk9PnqWFZ+DEXaaw8pvxizoJAci22Nflv1ckU9a9T9OdnCCEgq5A
XWjlRpQoljptDtGoNA5dQrTJo4wPA9h297QgNgg5AoGAOlKZuC4Fa4RWaltvgLrQ
6twylZTGVSm/njtK/FYdTen1wmNG6rDhkBkOMJnQKwgtjQHke9XxOpqLZTePLNs6
m+HAlDNOZe7ryiuK7dj04wY2qoO/kCsxO9bR1M8LGRWFIHd4e8ExGWn5Qxk0/9X+
8/teeCoaDHNy7R6167uxyX8=
-----END PRIVATE KEY-----`;
        const issuer = 'issuer.com';
        const keyStore = JWK.createKeyStore();
        const key = await keyStore.add(privateKey, 'pem');

        const service = new IdentityTokenService(
            privateKey,
            issuer,
            key.kid
        );

        const token = await service.getTokenForUser('egg@ghost.org', 'Legend');

        const claims = verify(token, key.toPEM());

        if (typeof claims === 'string') {
            throw new Error('Unexpected return type');
        }

        assert.equal(claims.sub, 'egg@ghost.org');
        assert.equal(claims.role, 'Legend');
        assert.equal(claims.iss, 'issuer.com');
    });
});
