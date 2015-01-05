define("ghost/tests/test-helper", 
  ["ember-cli/test-loader","ember/resolver","ember-mocha"],
  function(__dependency1__, __dependency2__, __dependency3__) {
    "use strict";
    var TestLoader = __dependency1__["default"];
    var Resolver = __dependency2__["default"];
    var setResolver = __dependency3__.setResolver;

    var resolver = Resolver.create();
    resolver.namespace = {
      modulePrefix: 'ghost'
    };

    setResolver(resolver);

    TestLoader.load();

    window.expect = chai.expect;

    mocha.checkLeaks();
    mocha.globals(['jQuery', 'EmberInspector']);
    mocha.run();
  });
define("ghost/tests/unit/components/gh-trim-focus-input_test", 
  ["ember-mocha"],
  function(__dependency1__) {
    "use strict";
    /* jshint expr:true */
    var describeComponent = __dependency1__.describeComponent;
    var it = __dependency1__.it;

    describeComponent('gh-trim-focus-input', function () {
        it('trims value on focusOut', function () {
            var component = this.subject({
                value: 'some random stuff   '
            });

            this.render();

            component.$().focusout();
            expect(component.$().val()).to.equal('some random stuff');
        });
    });
  });
define("ghost/tests/unit/utils/ghost-paths_test", 
  ["ghost/utils/ghost-paths"],
  function(__dependency1__) {
    "use strict";
    /* jshint expr:true */

    var ghostPaths = __dependency1__["default"];

    describe('ghost-paths', function () {
        describe('join', function () {
            var join = ghostPaths().url.join;

            it('should join two or more paths, normalizing slashes', function () {
                var path;

                path = join('/one/', '/two/');
                expect(path).to.equal('/one/two/');

                path = join('/one', '/two/');
                expect(path).to.equal('/one/two/');

                path = join('/one/', 'two/');
                expect(path).to.equal('/one/two/');

                path = join('/one/', 'two/', '/three/');
                expect(path).to.equal('/one/two/three/');

                path = join('/one/', 'two', 'three/');
                expect(path).to.equal('/one/two/three/');
            });

            it('should not change the slash at the beginning', function () {
                var path;

                path = join('one/');
                expect(path).to.equal('one/');
                path = join('one/', 'two');
                expect(path).to.equal('one/two/');
                path = join('/one/', 'two');
                expect(path).to.equal('/one/two/');
                path = join('one/', 'two', 'three');
                expect(path).to.equal('one/two/three/');
                path = join('/one/', 'two', 'three');
                expect(path).to.equal('/one/two/three/');
            });

            it('should always return a slash at the end', function () {
                var path;

                path = join();
                expect(path).to.equal('/');
                path = join('');
                expect(path).to.equal('/');
                path = join('one');
                expect(path).to.equal('one/');
                path = join('one/');
                expect(path).to.equal('one/');
                path = join('one', 'two');
                expect(path).to.equal('one/two/');
                path = join('one', 'two/');
                expect(path).to.equal('one/two/');
            });
        });
    });
  });
//# sourceMappingURL=ghost-tests.js.map