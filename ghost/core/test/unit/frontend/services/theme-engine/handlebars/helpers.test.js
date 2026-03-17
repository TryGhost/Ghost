const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const hbs = require('../../../../../../core/frontend/services/theme-engine/engine');

// Stuff we are testing
const helpers = require('../../../../../../core/frontend/services/helpers');

describe('Helpers', function () {
    const hbsHelpers = ['each', 'if', 'unless', 'with', 'helperMissing', 'blockHelperMissing', 'log', 'lookup', 'block', 'contentFor'];
    const ghostHelpers = [
        'asset', 'authors', 'body_class', 'cancel_link', 'color_to_rgba', 'concat', 'content', 'content_api_key', 'content_api_url', 'contrast_text_color', 'date', 'encode', 'excerpt', 'facebook_url', 'foreach', 'get',
        'ghost_foot', 'ghost_head', 'has', 'img_url', 'is', 'json', 'link', 'link_class', 'meta_description', 'meta_title', 'navigation',
        'next_post', 'page_url', 'pagination', 'plural', 'post_class', 'prev_post', 'price', 'raw', 'reading_time', 'split', 't', 'tags', 'title','total_members', 'total_paid_members', 'twitter_url',
        'url', 'comment_count', 'collection', 'recommendations', 'readable_url', 'social_url'
    ];
    const experimentalHelpers = ['match', 'tiers', 'comments', 'search'];

    const expectedHelpers = _.concat(hbsHelpers, ghostHelpers, experimentalHelpers);

    describe('Load Core Helpers', function () {
        before(function () {
            hbs.express4();
            helpers.init();
        });

        // This will work when we finish refactoring
        it('should have exactly the right helpers', function () {
            const foundHelpers = _.keys(hbs.handlebars.helpers);
            const missingHelpers = _.difference(expectedHelpers, foundHelpers);
            const unexpectedHelpers = _.difference(foundHelpers, expectedHelpers);

            assert.deepEqual(missingHelpers, []);
            assert.deepEqual(unexpectedHelpers, []);
        });
    });

    describe('gscan compatibility', function () {
        // Ghost helpers that are not intended for theme developers and are
        // legitimately absent from gscan's knownHelpers.
        const internalHelpers = [
            'raw', // internal helper used by Ghost's own templates
            'collection', // experimental, not yet stable for themes
            'search' // experimental, not yet in gscan
        ];

        // Helpers that are available for themes but gscan doesn't know about yet.
        // When gscan is updated, remove entries here — the test will fail if you
        // add a new helper without updating either this list or gscan.
        const pendingGscanUpdate = [
            'json',
            'color_to_rgba',
            'contrast_text_color'
        ];

        it('should track helpers not yet known to gscan', function () {
            const gscanSpec = require('gscan/lib/specs/v6');
            const gscanKnownHelpers = new Set(gscanSpec.knownHelpers);

            const helpersDir = path.join(__dirname, '../../../../../../core/frontend/helpers');
            const globalHelperFiles = fs.readdirSync(helpersDir)
                .filter(f => f.endsWith('.js') && f !== 'index.js' && f !== 'register.js')
                .map(f => f.replace('.js', ''));

            const missing = globalHelperFiles
                .filter(h => !internalHelpers.includes(h))
                .filter(h => !gscanKnownHelpers.has(h));

            // This assertion ensures the missing set matches exactly what we expect.
            // If you add a new helper, it will fail until you either:
            //   1. Add it to gscan's knownHelpers (preferred), or
            //   2. Add it to pendingGscanUpdate with a tracking issue
            assert.deepEqual(missing.sort(), pendingGscanUpdate.sort(),
                'gscan helper mismatch. If you added a new helper, update gscan or add to pendingGscanUpdate.'
            );
        });
    });
});
