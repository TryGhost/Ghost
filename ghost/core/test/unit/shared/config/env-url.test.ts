import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

// @tryghost/validator currently lacks type declarations.
const validator = require('@tryghost/validator');

const envDir = path.join(__dirname, '../../../../core/shared/config/env');

const readEnvConfig = (file: string): {url?: string} => (
    JSON.parse(fs.readFileSync(path.join(envDir, file), 'utf8'))
);

/**
 * The `@tryghost/validator` version pinned here bundles a validator.js old
 * enough to exempt `localhost` from its host check, while newer copies of the
 * same package — resolved by some of our dependencies — reject it. So a host
 * is only treated as valid if it is an IP literal or carries a TLD, which is
 * what every version agrees on.
 */
const hasUsableHost = (url: URL): boolean => {
    // `URL` keeps IPv6 hosts wrapped in brackets; `net.isIP` wants them bare.
    const hostname = url.hostname.replace(/^\[|]$/g, '');
    return Boolean(net.isIP(hostname)) || hostname.includes('.');
};

describe('Config env URLs', function () {
    const envFiles = fs.readdirSync(envDir).filter(file => file.endsWith('.json'));

    it('finds env config files to check', function () {
        assert(envFiles.length > 0);
    });

    envFiles.forEach(function (file) {
        it(`${file} has a valid url`, function () {
            const {url} = readEnvConfig(file);

            if (!url) {
                return;
            }

            assert(
                validator.isURL(url),
                `${file} sets url to ${url}, which is not a valid URL`
            );

            assert(
                hasUsableHost(new URL(url)),
                `${file} sets url to ${url}, whose host is neither an IP nor a name with a TLD`
            );
        });
    });
});
