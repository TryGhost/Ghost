const express = require('express');
const request = require('supertest');

// Module under test
const middleware = require('../../../../../../core/server/web/api/endpoints/admin/middleware');

const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];

const createApiKey = (userId) => {
    return {
        get(field) {
            if (field === 'user_id') {
                return userId;
            }
        }
    };
};

const createApp = ({apiKey = null, user = null} = {}) => {
    const app = express();

    app.use((req, res, next) => {
        req.api_key = apiKey;
        req.user = user;
        next();
    });

    app.use(tokenPermissionCheck);

    app.use((req, res) => {
        res.json({ok: true});
    });

    app.use((err, req, res, _next) => {
        void _next;

        res.status(err.statusCode || 500).json({
            error: {
                message: err.message,
                statusCode: err.statusCode
            }
        });
    });

    return app;
};

describe('Admin API Middleware', function () {
    describe('tokenPermissionCheck', function () {
        describe('User Authentication (no API key)', function () {
            it('should call next() when user is authenticated without API key', async function () {
                await request(createApp({
                    user: {id: 'abcd1234'}
                }))
                    .get('/posts')
                    .expect(200)
                    .expect({ok: true});
            });
        });

        describe('Staff Token Authentication', function () {
            const app = createApp({
                apiKey: createApiKey('abcd1234'),
                user: {id: 'abcd1234', role: 'Editor'}
            });

            it('should allow staff tokens to access regular endpoints', async function () {
                await request(app)
                    .get('/posts/')
                    .expect(200)
                    .expect({ok: true});
            });

            it('should block staff tokens from DELETE /db/ endpoint', async function () {
                await request(app)
                    .delete('/db/')
                    .expect(403)
                    .expect({
                        error: {
                            message: 'Staff tokens are not allowed to access this endpoint',
                            statusCode: 403
                        }
                    });
            });

            it('should block staff tokens from PUT /users/owner/ endpoint', async function () {
                await request(app)
                    .put('/users/owner/')
                    .expect(403)
                    .expect({
                        error: {
                            message: 'Staff tokens are not allowed to access this endpoint',
                            statusCode: 403
                        }
                    });
            });

            it('should allow staff tokens to POST to /db/ endpoint', async function () {
                await request(app)
                    .post('/db/')
                    .expect(200)
                    .expect({ok: true});
            });

            it('should allow staff tokens to GET /users/owner/ endpoint', async function () {
                await request(app)
                    .get('/users/owner/')
                    .expect(200)
                    .expect({ok: true});
            });

            it('should allow staff tokens to access endpoints without trailing slash', async function () {
                await request(app)
                    .get('/posts')
                    .expect(200)
                    .expect({ok: true});
            });

            it('should block staff tokens from DELETE /db (without trailing slash)', async function () {
                await request(app)
                    .delete('/db')
                    .expect(403)
                    .expect({
                        error: {
                            message: 'Staff tokens are not allowed to access this endpoint',
                            statusCode: 403
                        }
                    });
            });

            it('should block staff tokens from PUT /users/owner (without trailing slash)', async function () {
                await request(app)
                    .put('/users/owner')
                    .expect(403)
                    .expect({
                        error: {
                            message: 'Staff tokens are not allowed to access this endpoint',
                            statusCode: 403
                        }
                    });
            });
        });

        describe('Integration Token Authentication', function () {
            const app = createApp({
                apiKey: createApiKey(null)
            });

            it('should allow integration tokens to access allowlisted endpoints', async function () {
                await request(app)
                    .get('/posts')
                    .expect(200)
                    .expect({ok: true});
            });

            it('should block integration tokens from non-allowlisted endpoints', async function () {
                await request(app)
                    .get('/non-existent')
                    .expect(403)
                    .expect({
                        error: {
                            message: 'API tokens do not have permission to access this endpoint',
                            statusCode: 403
                        }
                    });
            });

            it('should allow integration tokens to POST to /db endpoint', async function () {
                await request(app)
                    .post('/db')
                    .expect(200)
                    .expect({ok: true});
            });

            it('should block integration tokens from DELETE /db endpoint', async function () {
                await request(app)
                    .delete('/db')
                    .expect(403)
                    .expect({
                        error: {
                            message: 'API tokens do not have permission to access this endpoint',
                            statusCode: 403
                        }
                    });
            });
        });

        describe('God Mode', function () {
            const originalEnv = process.env.NODE_ENV;

            afterEach(function () {
                process.env.NODE_ENV = originalEnv;
            });

            it('should allow access in development with god_mode query param', async function () {
                process.env.NODE_ENV = 'development';

                await request(createApp({
                    apiKey: createApiKey(null)
                }))
                    .get('/non-existent?god_mode=true')
                    .expect(200)
                    .expect({ok: true});
            });

            it('should not allow god mode in production', async function () {
                process.env.NODE_ENV = 'production';

                await request(createApp({
                    apiKey: createApiKey(null)
                }))
                    .get('/non-existent?god_mode=true')
                    .expect(403)
                    .expect({
                        error: {
                            message: 'API tokens do not have permission to access this endpoint',
                            statusCode: 403
                        }
                    });
            });
        });
    });
});
