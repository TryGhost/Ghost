import assert from 'node:assert/strict';
import {getCurrentScope, getRootContainer, setDefaultScope, resetContainer, hasDefaultScope} from '../../../../core/shared/container/current';
import {ContainerResolutionError} from '../../../../core/shared/container/container';

describe('container/current', function () {
    afterEach(function () {
        resetContainer();
    });

    it('throws when no default scope has been set', function () {
        assert.throws(() => getCurrentScope(), ContainerResolutionError);
    });

    it('returns the default scope once set', function () {
        const scope = getRootContainer().createScope();
        setDefaultScope(scope);

        assert.equal(getCurrentScope(), scope);
    });

    it('memoizes the root container', function () {
        assert.equal(getRootContainer(), getRootContainer());
    });

    it('reports whether a default scope is set', function () {
        assert.equal(hasDefaultScope(), false);
        setDefaultScope(getRootContainer().createScope());
        assert.equal(hasDefaultScope(), true);
    });

    it('resets both root and default scope', function () {
        const root = getRootContainer();
        setDefaultScope(root.createScope());
        resetContainer();

        assert.notEqual(getRootContainer(), root);
        assert.throws(() => getCurrentScope(), ContainerResolutionError);
    });
});
