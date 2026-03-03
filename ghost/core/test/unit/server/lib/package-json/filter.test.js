const assert = require('node:assert/strict');

const packageJSON = require('../../../../../core/server/lib/package-json');

describe('package-json filter', function () {
    // @TODO: introduce some non-theme package examples
    const casper = {
        name: 'casper',
        path: '~/content/themes/casper',
        'package.json': {
            name: 'casper',
            description: 'The default personal blogging theme for Ghost. Beautiful, minimal and responsive.',
            demo: 'https://demo.ghost.io',
            version: '1.3.5',
            engines: {},
            license: 'MIT',
            screenshots: {},
            author: {},
            gpm: {},
            keywords: {},
            repository: {},
            bugs: 'https://github.com/TryGhost/Casper/issues',
            contributors: 'https://github.com/TryGhost/Casper/graphs/contributors'
        }
    };

    const simplePackage = {
        name: 'simple',
        path: '~/content/themes/simple',
        'package.json': {
            name: 'simple',
            version: '0.1.0'
        }
    };

    const missingPackageJson = {
        name: 'missing',
        path: '~/content/themes/missing',
        'package.json': null
    };

    it('should filter packages correctly', function () {
        const result = packageJSON.filter({casper: casper});
        let package1;

        assert(Array.isArray(result));
        assert.equal(result.length, 1);
        package1 = result[0];

        assert(package1 && typeof package1 === 'object');
        assert('name' in package1);
        assert('package' in package1);
        assert('active' in package1);
        assert(Array.isArray(Object.keys(package1)));
        assert.equal(Object.keys(package1).length, 3);
        assert.equal(package1.name, 'casper');
        assert(package1.package && typeof package1.package === 'object');
        assert('name' in package1.package);
        assert('version' in package1.package);
        assert.equal(package1.active, false);
    });

    it('should filter packages and handle a single active package string', function () {
        const result = packageJSON.filter({casper: casper, simple: simplePackage}, 'casper');
        let package1;
        let package2;

        assert(Array.isArray(result));
        assert.equal(result.length, 2);
        package1 = result[0];
        package2 = result[1];

        assert(package1 && typeof package1 === 'object');
        assert('name' in package1);
        assert('package' in package1);
        assert('active' in package1);
        assert(Array.isArray(Object.keys(package1)));
        assert.equal(Object.keys(package1).length, 3);
        assert.equal(package1.name, 'casper');
        assert(package1.package && typeof package1.package === 'object');
        assert('name' in package1.package);
        assert('version' in package1.package);
        assert.equal(package1.active, true);

        assert(package2 && typeof package2 === 'object');
        assert('name' in package2);
        assert('package' in package2);
        assert('active' in package2);
        assert(Array.isArray(Object.keys(package2)));
        assert.equal(Object.keys(package2).length, 3);
        assert.equal(package2.name, 'simple');
        assert(package2.package && typeof package2.package === 'object');
        assert('name' in package2.package);
        assert('version' in package2.package);
        assert.equal(package2.active, false);
    });

    it('should filter packages and handle an array of active packages', function () {
        const result = packageJSON.filter({casper: casper, simple: simplePackage}, ['casper', 'simple']);
        let package1;
        let package2;

        assert(Array.isArray(result));
        assert.equal(result.length, 2);
        package1 = result[0];
        package2 = result[1];

        assert(package1 && typeof package1 === 'object');
        assert('name' in package1);
        assert('package' in package1);
        assert('active' in package1);
        assert(Array.isArray(Object.keys(package1)));
        assert.equal(Object.keys(package1).length, 3);
        assert.equal(package1.name, 'casper');
        assert(package1.package && typeof package1.package === 'object');
        assert('name' in package1.package);
        assert('version' in package1.package);
        assert.equal(package1.active, true);

        assert(package2 && typeof package2 === 'object');
        assert('name' in package2);
        assert('package' in package2);
        assert('active' in package2);
        assert(Array.isArray(Object.keys(package2)));
        assert.equal(Object.keys(package2).length, 3);
        assert.equal(package2.name, 'simple');
        assert(package2.package && typeof package2.package === 'object');
        assert('name' in package2.package);
        assert('version' in package2.package);
        assert.equal(package2.active, true);
    });

    it('handles packages with no package.json even though this makes us sad', function () {
        const result = packageJSON.filter({casper: casper, missing: missingPackageJson}, ['casper']);
        let package1;
        let package2;

        assert(Array.isArray(result));
        assert.equal(result.length, 2);
        package1 = result[0];
        package2 = result[1];

        assert(package1 && typeof package1 === 'object');
        assert('name' in package1);
        assert('package' in package1);
        assert('active' in package1);
        assert(Array.isArray(Object.keys(package1)));
        assert.equal(Object.keys(package1).length, 3);
        assert.equal(package1.name, 'casper');
        assert(package1.package && typeof package1.package === 'object');
        assert('name' in package1.package);
        assert('version' in package1.package);
        assert.equal(package1.active, true);

        assert(package2 && typeof package2 === 'object');
        assert('name' in package2);
        assert('package' in package2);
        assert('active' in package2);
        assert(Array.isArray(Object.keys(package2)));
        assert.equal(Object.keys(package2).length, 3);
        assert.equal(package2.name, 'missing');
        assert.equal(package2.package, false);
        assert.equal(package2.active, false);
    });

    it('filters out things which are not packages', function () {
        const result = packageJSON.filter({
            '.git': {}, '.anything': {}, 'README.md': {}, _messages: {}
        });
        assert.deepEqual(result, []);
    });
});
