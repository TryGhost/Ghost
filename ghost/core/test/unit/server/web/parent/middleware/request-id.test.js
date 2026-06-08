const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const validator = require('@tryghost/validator');

const requestId = require('../../../../../../core/server/web/parent/middleware/request-id');

describe('Request ID middleware', function () {
    const app = express();
    app.use(requestId);
    app.get('/', (req, res) => {
        res.json({requestId: req.requestId});
    });

    it('generates a new request ID if X-Request-ID not present', async function () {
        const {headers, body} = await request(app).get('/');
        assert(!('x-request-id' in headers));
        assert(validator.isUUID(body.requestId));
    });

    it('generates a new request ID if X-Request-ID is an empty string', async function () {
        const {headers, body} = await request(app)
            .get('/')
            .set('X-Request-ID', '');
        assert(!('x-request-id' in headers));
        assert(validator.isUUID(body.requestId));
    });

    it('keeps the request ID if X-Request-ID is present', async function () {
        await request(app)
            .get('/')
            .set('X-Request-ID', 'abcd')
            .expect('X-Request-ID', 'abcd')
            .expect({requestId: 'abcd'});
    });
});
