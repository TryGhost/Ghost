import Application from 'ghost-admin/app';
import PostsRoute from 'ghost-admin/routes/posts';
import config from 'ghost-admin/config/environment';
import registerWaiter from 'ember-raf-scheduler/test-support/register-waiter';
import start from 'ember-exam/test-support/start';
import {afterEach, beforeEach} from 'mocha';
import {setApplication} from '@ember/test-helpers';

import chai from 'chai';
import chaiDom from 'chai-dom';
import sinonChai from 'sinon-chai';
chai.use(chaiDom);
chai.use(sinonChai);

setApplication(Application.create(config.APP));

registerWaiter();

mocha.setup({
    timeout: 15000,
    slow: 500
});

// Every Ember transition into posts or pages hands off to React by writing
// window.location.hash, which would leak into later tests on the runner (the
// billing service reads it). Tests that assert the hand-off stub the route
// instance instead.
const navigateToReactRoute = PostsRoute.prototype._navigateToReactRoute;
beforeEach(function () {
    PostsRoute.prototype._navigateToReactRoute = function () {};
});
afterEach(function () {
    PostsRoute.prototype._navigateToReactRoute = navigateToReactRoute;
});

start();
