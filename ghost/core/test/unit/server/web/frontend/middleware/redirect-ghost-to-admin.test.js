const assert = require('node:assert/strict');
const sinon = require('sinon');
const express = require('express');
const config = require('../../../../../../core/shared/config');

// Thing we are testing
const redirectGhostToAdmin = require('../../../../../../core/frontend/web/middleware/redirect-ghost-to-admin');

describe('Frontend Web', function () {
    describe('redirectGhostToAdmin middleware', function () {
        let configStub;
        let sandbox;

        beforeEach(function () {
            sandbox = sinon.createSandbox();
            configStub = sandbox.stub(config, 'get');
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('should redirect all /ghost/* paths to admin domain', function () {
            configStub.withArgs('admin:redirects').returns(true);
            
            const router = redirectGhostToAdmin();
            
            // Should have 2 routes: generic router route + our 1 ghost route
            assert.equal(router.stack.length, 2, 'Router should have 2 routes when redirects are enabled');
            
            // Test that our ghost route matches the expected pattern
            // Skip the first route (generic Express router route) and test our ghost one
            const ghostRoute = router.stack[1].regexp;  // /^\/ghost(\/.*)?$/
            
            // Test URLs that should match the ghost route
            const matchingPaths = [
                '/ghost',
                '/ghost/',
                '/ghost/.well-known/jwks.json',
                '/ghost/api/admin/users',
                '/ghost/settings',
                '/ghost/a/b/c'
            ];
            matchingPaths.forEach(url => {
                const matches = ghostRoute.test(url);
                assert.equal(matches, true, `${url} should match the ghost route`);
            });
            
            // Test URLs that should NOT match the ghost route
            const nonMatchingPaths = [
                '/something/ghost',
                '/ghostly',
                '/api/ghost',
                '/ghost2'
            ];
            nonMatchingPaths.forEach(url => {
                const matches = ghostRoute.test(url);
                assert.equal(matches, false, `${url} should NOT match the ghost route`);
            });
        });

        it('should not register any routes when admin redirects are disabled', function () {
            configStub.withArgs('admin:redirects').returns(false);
            
            const router = redirectGhostToAdmin();
            
            // Should only have the generic router route, no ghost-specific routes
            assert.equal(router.stack.length, 1);
            // The one route should be the generic Express router route
            assert.equal(router.stack[0].regexp.source, '^\\/?(?=\\/|$)');
        });
    });
});