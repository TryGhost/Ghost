const {describe, it} = require('node:test');
const assert = require('node:assert');

const {selectPackagesToPublish} = require('../../.github/scripts/publish-koenig-packages');

/**
 * Build a selector entry. `changed` marks the package's directory as modified
 * since the previous release tag; `previousVersion` is the version at that
 * tag (null when the package didn't exist yet).
 */
function entry({name, version, previousVersion, changed, dependencies, devDependencies, peerDependencies}) {
    return {
        name,
        changed: !!changed,
        previousVersion: previousVersion === undefined ? version : previousVersion,
        pkg: {name, version, dependencies, devDependencies, peerDependencies}
    };
}

describe('selectPackagesToPublish', function () {
    it('selects changed packages and skips unchanged ones', function () {
        const selected = selectPackagesToPublish([
            entry({name: '@tryghost/kg-utils', version: '1.1.4', previousVersion: '1.1.3', changed: true}),
            entry({name: '@tryghost/kg-converters', version: '1.0.3', changed: false})
        ]);

        assert.ok(selected.has('@tryghost/kg-utils'));
        assert.ok(!selected.has('@tryghost/kg-converters'));
    });

    it('does not republish dependents for a patch-line change', function () {
        const selected = selectPackagesToPublish([
            entry({name: '@tryghost/kg-utils', version: '1.1.4', previousVersion: '1.1.3', changed: true}),
            entry({
                name: '@tryghost/kg-default-nodes',
                version: '2.1.3',
                changed: false,
                dependencies: {'@tryghost/kg-utils': 'workspace:~'}
            })
        ]);

        assert.ok(!selected.has('@tryghost/kg-default-nodes'));
    });

    it('republishes direct runtime dependents when a dependency moves to a new minor line', function () {
        const selected = selectPackagesToPublish([
            entry({name: '@tryghost/kg-utils', version: '1.2.0', previousVersion: '1.1.3', changed: true}),
            entry({
                name: '@tryghost/kg-default-nodes',
                version: '2.1.3',
                changed: false,
                dependencies: {'@tryghost/kg-utils': 'workspace:~'}
            })
        ]);

        assert.ok(selected.has('@tryghost/kg-default-nodes'));
        assert.match(selected.get('@tryghost/kg-default-nodes'), /@tryghost\/kg-utils/);
        assert.match(selected.get('@tryghost/kg-default-nodes'), /1\.2/);
    });

    it('republishes direct runtime dependents when a dependency moves to a new major line', function () {
        const selected = selectPackagesToPublish([
            entry({name: '@tryghost/kg-utils', version: '2.0.0', previousVersion: '1.1.3', changed: true}),
            entry({
                name: '@tryghost/kg-default-nodes',
                version: '2.1.3',
                changed: false,
                dependencies: {'@tryghost/kg-utils': 'workspace:~'}
            })
        ]);

        assert.ok(selected.has('@tryghost/kg-default-nodes'));
    });

    it('includes peerDependencies edges when a line moves', function () {
        const selected = selectPackagesToPublish([
            entry({name: '@tryghost/kg-utils', version: '1.2.0', previousVersion: '1.1.3', changed: true}),
            entry({
                name: '@tryghost/koenig-lexical',
                version: '3.0.5',
                changed: false,
                peerDependencies: {'@tryghost/kg-utils': 'workspace:~'}
            })
        ]);

        assert.ok(selected.has('@tryghost/koenig-lexical'));
    });

    it('ignores devDependencies edges — consumers never install them', function () {
        const selected = selectPackagesToPublish([
            entry({name: '@tryghost/kg-utils', version: '1.2.0', previousVersion: '1.1.3', changed: true}),
            entry({
                name: '@tryghost/kg-converters',
                version: '1.0.3',
                changed: false,
                devDependencies: {'@tryghost/kg-utils': 'workspace:~'}
            })
        ]);

        assert.ok(!selected.has('@tryghost/kg-converters'));
    });

    it('does not cascade to transitive dependents — tilde ranges reach the fresh patch', function () {
        // A moves line; B depends on A and republishes as a patch bump within
        // its own line; C's published ~B range already reaches that patch.
        const selected = selectPackagesToPublish([
            entry({name: '@tryghost/kg-utils', version: '1.2.0', previousVersion: '1.1.3', changed: true}),
            entry({
                name: '@tryghost/kg-default-nodes',
                version: '2.1.3',
                changed: false,
                dependencies: {'@tryghost/kg-utils': 'workspace:~'}
            }),
            entry({
                name: '@tryghost/kg-lexical-html-renderer',
                version: '1.4.3',
                changed: false,
                dependencies: {'@tryghost/kg-default-nodes': 'workspace:~'}
            })
        ]);

        assert.ok(selected.has('@tryghost/kg-default-nodes'));
        assert.ok(!selected.has('@tryghost/kg-lexical-html-renderer'));
    });

    it('treats a new package as changed without triggering dependents', function () {
        const selected = selectPackagesToPublish([
            entry({name: '@tryghost/kg-new-thing', version: '0.1.0', previousVersion: null, changed: true}),
            entry({
                name: '@tryghost/kg-default-nodes',
                version: '2.1.3',
                changed: false,
                dependencies: {'@tryghost/kg-new-thing': 'workspace:~'}
            })
        ]);

        assert.ok(selected.has('@tryghost/kg-new-thing'));
        assert.ok(!selected.has('@tryghost/kg-default-nodes'));
    });

    it('keeps the changed reason when a package is both changed and a dependent', function () {
        const selected = selectPackagesToPublish([
            entry({name: '@tryghost/kg-utils', version: '1.2.0', previousVersion: '1.1.3', changed: true}),
            entry({
                name: '@tryghost/kg-default-nodes',
                version: '2.1.4',
                previousVersion: '2.1.3',
                changed: true,
                dependencies: {'@tryghost/kg-utils': 'workspace:~'}
            })
        ]);

        assert.strictEqual(selected.get('@tryghost/kg-default-nodes'), 'directory changed');
    });
});
