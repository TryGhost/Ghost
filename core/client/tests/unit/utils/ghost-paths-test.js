import ghostPaths from 'ghost/utils/ghost-paths';

describe('Unit: Util: ghost-paths', function () {
    describe('join', function () {
        const {join} = ghostPaths().url;

        it('should join two or more paths, normalizing slashes', function () {
            let path;

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
            let path;

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
            let path;

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
