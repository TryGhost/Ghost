const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const validator = require('@tryghost/validator');

const envDir = path.join(__dirname, '../../../../core/shared/config/env');

describe('Config env URLs', function () {
    // The default scheduling adapter pings its jobs through @tryghost/request,
    // which rejects anything `validator.isURL` doesn't like — and that runs
    // with validator's `require_tld: true` default. A hostname without a TLD
    // (`localhost`) therefore fails before a request is made, so every
    // scheduled post silently never publishes with `URL_MISSING_INVALID`.
    // Loopback works because it validates as an IP rather than a hostname.
    const envFiles = fs.readdirSync(envDir).filter(file => file.endsWith('.json'));

    // Guard against the filter above silently matching nothing if the
    // directory is ever restructured.
    assert(envFiles.length > 0, 'expected to find env config files');

    envFiles.forEach(function (file) {
        it(`${file} has a url the scheduler can ping`, function () {
            const config = JSON.parse(fs.readFileSync(path.join(envDir, file), 'utf8'));

            if (!config.url) {
                return;
            }

            assert(
                validator.isURL(config.url),
                `${file} sets url to ${config.url}, which @tryghost/request rejects as invalid`
            );
        });
    });
});
