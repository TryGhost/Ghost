import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const envDir = path.join(__dirname, '../../../../core/shared/config/env');

const readEnvConfig = (file: string): {url?: string} => (
    JSON.parse(fs.readFileSync(path.join(envDir, file), 'utf8'))
);

/**
 * A host is only usable by libraries that validate URLs strictly if it is an
 * IP literal or carries a TLD. A bare hostname such as `localhost` parses
 * fine but is rejected by strict validators, so it can't be treated as valid
 * here either.
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

            let parsed: URL;
            try {
                parsed = new URL(url);
            } catch {
                assert.fail(`${file} sets url to ${url}, which is not a valid URL`);
            }

            assert(
                hasUsableHost(parsed),
                `${file} sets url to ${url}, whose host is neither an IP nor a name with a TLD`
            );
        });
    });
});
