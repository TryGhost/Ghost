const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const express = require('express');
const request = require('supertest');
const ghostLocals = require('../../../../../../core/server/web/parent/middleware/ghost-locals');

describe('Theme Handler', function () {
    const app = express();
    app.use(ghostLocals);
    app.get('/awesome-post', (_req, res) => {
        res.json(res.locals);
    });

    describe('ghostLocals', function () {
        it('sets all locals', async function () {
            const {body} = await request(app)
                .get('/awesome-post');
            assertExists(body.version);
            assertExists(body.safeVersion);
            assert.equal(body.relativeUrl, '/awesome-post');
        });
    });
});
