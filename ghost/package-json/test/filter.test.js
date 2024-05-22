require('./utils');
const packageJSON = require('../');

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

        result.should.be.an.Array().with.lengthOf(1);
        package1 = result[0];

        package1.should.be.an.Object().with.properties('name', 'package', 'active');
        Object.keys(package1).should.be.an.Array().with.lengthOf(3);
        package1.name.should.eql('casper');
        package1.package.should.be.an.Object().with.properties('name', 'version');
        package1.active.should.be.false();
    });

    it('should filter packages and handle a single active package string', function () {
        const result = packageJSON.filter({casper: casper, simple: simplePackage}, 'casper');
        let package1;
        let package2;

        result.should.be.an.Array().with.lengthOf(2);
        package1 = result[0];
        package2 = result[1];

        package1.should.be.an.Object().with.properties('name', 'package', 'active');
        Object.keys(package1).should.be.an.Array().with.lengthOf(3);
        package1.name.should.eql('casper');
        package1.package.should.be.an.Object().with.properties('name', 'version');
        package1.active.should.be.true();

        package2.should.be.an.Object().with.properties('name', 'package', 'active');
        Object.keys(package2).should.be.an.Array().with.lengthOf(3);
        package2.name.should.eql('simple');
        package2.package.should.be.an.Object().with.properties('name', 'version');
        package2.active.should.be.false();
    });

    it('should filter packages and handle an array of active packages', function () {
        const result = packageJSON.filter({casper: casper, simple: simplePackage}, ['casper', 'simple']);
        let package1;
        let package2;

        result.should.be.an.Array().with.lengthOf(2);
        package1 = result[0];
        package2 = result[1];

        package1.should.be.an.Object().with.properties('name', 'package', 'active');
        Object.keys(package1).should.be.an.Array().with.lengthOf(3);
        package1.name.should.eql('casper');
        package1.package.should.be.an.Object().with.properties('name', 'version');
        package1.active.should.be.true();

        package2.should.be.an.Object().with.properties('name', 'package', 'active');
        Object.keys(package2).should.be.an.Array().with.lengthOf(3);
        package2.name.should.eql('simple');
        package2.package.should.be.an.Object().with.properties('name', 'version');
        package2.active.should.be.true();
    });

    it('handles packages with no package.json even though this makes us sad', function () {
        const result = packageJSON.filter({casper: casper, missing: missingPackageJson}, ['casper']);
        let package1;
        let package2;

        result.should.be.an.Array().with.lengthOf(2);
        package1 = result[0];
        package2 = result[1];

        package1.should.be.an.Object().with.properties('name', 'package', 'active');
        Object.keys(package1).should.be.an.Array().with.lengthOf(3);
        package1.name.should.eql('casper');
        package1.package.should.be.an.Object().with.properties('name', 'version');
        package1.active.should.be.true();

        package2.should.be.an.Object().with.properties('name', 'package', 'active');
        Object.keys(package2).should.be.an.Array().with.lengthOf(3);
        package2.name.should.eql('missing');
        package2.package.should.be.false();
        package2.active.should.be.false();
    });

    it('filters out things which are not packages', function () {
        const result = packageJSON.filter({
            '.git': {}, '.anything': {}, 'README.md': {}, _messages: {}
        });
        result.should.be.an.Array().with.lengthOf(0);
    });
});
