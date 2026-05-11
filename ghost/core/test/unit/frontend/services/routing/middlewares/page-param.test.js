const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const middleware = require('../../../../../../core/frontend/services/routing/middleware');

describe('UNIT: services/routing/middleware/page-param', function () {
    const app = express();
    app.param('page', middleware.pageParam);
    app.get('/blog/page/:page/', (req, res) => {
        res.json({page: req.params.page});
    });
    app.get('/blog/rss/page/:page/', (req, res) => {
        res.json({page: req.params.page});
    });
    app.use((err, _req, res, _next) => {
        void _next;
        res.status(404).json({errorType: err.name});
    });

    it('success', async function () {
        const {body} = await request(app)
            .get('/blog/page/2/')
            .expect(200);
        assert.equal(body.page, 2);
    });

    it('redirect for /page/1/', async function () {
        await request(app)
            .get('/blog/page/1/')
            .expect(301)
            .expect('Location', '/blog/');
    });

    it('404 for /page/0/', async function () {
        await request(app)
            .get('/blog/page/0/')
            .expect(404)
            .expect({errorType: 'NotFoundError'});
    });

    it('404 for /page/something/', async function () {
        await request(app)
            .get('/blog/page/something/')
            .expect(404)
            .expect({errorType: 'NotFoundError'});
    });

    it('redirect for /rss/page/1/', async function () {
        await request(app)
            .get('/blog/rss/page/1/')
            .expect(301)
            .expect('Location', '/blog/rss/');
    });
});
