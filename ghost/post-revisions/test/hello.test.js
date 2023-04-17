const assert = require('assert');
const PostRevisions = require('../');

const config = {
    max_revisions: 10
};

describe('PostRevisions', function () {
    describe('shouldGenerateRevision', function () {
        it('should return false if there is no previous', function () {
            const postRevisions = new PostRevisions({config});

            const expected = false;
            const actual = postRevisions.shouldGenerateRevision(null, {}, []);

            assert.equal(actual, expected);
        });

        it('should return true if there are no revisions', function () {
            const postRevisions = new PostRevisions({config});

            const expected = true;
            const actual = postRevisions.shouldGenerateRevision({}, {}, []);

            assert.equal(actual, expected);
        });

        it('should return false if the current and previous html values are the same', function () {
            const postRevisions = new PostRevisions({config});

            const expected = false;
            const actual = postRevisions.shouldGenerateRevision({
                lexical: 'previous',
                html: 'blah'
            }, {
                lexical: 'current',
                html: 'blah'
            }, [{
                lexical: 'blah'
            }]);

            assert.equal(actual, expected);
        });

        it('should return true if the current and previous html values are different', function () {
            const postRevisions = new PostRevisions({config});

            const expected = true;
            const actual = postRevisions.shouldGenerateRevision({
                lexical: 'blah',
                html: 'blah'
            }, {
                lexical: 'blah',
                html: 'blah2'
            }, [{
                lexical: 'blah'
            }]);

            assert.equal(actual, expected);
        });
    });

    describe('getRevisions', function () {
        it('returns the original revisions if there is no previous', async function () {
            const postRevisions = new PostRevisions({config});

            const expected = [{
                lexical: 'blah'
            }];
            const actual = await postRevisions.getRevisions(null, {}, [{
                lexical: 'blah'
            }]);

            assert.deepEqual(actual, expected);
        });

        it('returns the original revisions if the current and previous', async function () {
            const postRevisions = new PostRevisions({config});

            const expected = [{
                lexical: 'revision'
            }];
            const actual = await postRevisions.getRevisions({
                lexical: 'blah',
                html: 'blah'
            }, {
                lexical: 'blah',
                html: 'blah'
            }, [{
                lexical: 'revision'
            }]);

            assert.deepEqual(actual, expected);
        });

        it('returns one revisions when there are no existing revisions', async function () {
            const postRevisions = new PostRevisions({config});

            const actual = await postRevisions.getRevisions({
                id: '1',
                lexical: 'previous',
                html: 'previous'
            }, {
                id: '1',
                lexical: 'current',
                html: 'current'
            }, []);

            assert.equal(actual.length, 1);
            assert.equal(actual[0].lexical, 'current');
        });

        it('limits the number of revisions to the max_revisions count', async function () {
            const postRevisions = new PostRevisions({
                config: {
                    max_revisions: 2
                }
            });

            const revisions = await postRevisions.getRevisions({
                id: '1',
                lexical: 'previous',
                html: 'previous'
            }, {
                id: '1',
                lexical: 'current',
                html: 'current'
            }, []);

            const actual = await postRevisions.getRevisions({
                id: '1',
                lexical: 'old',
                html: 'old'
            }, {
                id: '1',
                lexical: 'new',
                html: 'new'
            }, revisions);

            assert.equal(actual.length, 2);
        });
    });
});
