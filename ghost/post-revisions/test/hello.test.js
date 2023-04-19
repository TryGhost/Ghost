const assert = require('assert');
const sinon = require('sinon');
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

        it('should return true if the current and previous title values are different', function () {
            const postRevisions = new PostRevisions({config});

            const expected = true;
            const actual = postRevisions.shouldGenerateRevision({
                lexical: 'blah',
                html: 'blah',
                title: 'blah'
            }, {
                lexical: 'blah',
                html: 'blah',
                title: 'blah2'
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

        it('returns one revision when there are no existing revisions', async function () {
            const postRevisions = new PostRevisions({config});

            const actual = await postRevisions.getRevisions({
                id: '1',
                lexical: 'previous',
                html: 'previous',
                author_id: '123',
                title: 'foo bar baz'
            }, {
                id: '1',
                lexical: 'current',
                html: 'current',
                author_id: '123',
                title: 'foo bar baz'
            }, []);

            assert.equal(actual.length, 1);
            assert.equal(actual[0].lexical, 'current');
            assert.equal(actual[0].author_id, '123');
            assert.equal(actual[0].title, 'foo bar baz');
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

    describe('removeAuthor', function () {
        it('removes the provided author from post revisions', async function () {
            const authorId = 'abc123';
            const options = {
                transacting: {}
            };
            const revisions = [
                {
                    id: 'revision123',
                    post_id: 'post123',
                    author_id: 'author123'
                },
                {
                    id: 'revision456',
                    post_id: 'post123',
                    author_id: 'author123'
                },
                {
                    id: 'revision789',
                    post_id: 'post123',
                    author_id: 'author456'
                }
            ];
            const modelStub = {
                findAll: sinon.stub().resolves({
                    toJSON: () => revisions
                }),
                bulkEdit: sinon.stub().resolves()
            };
            const postRevisions = new PostRevisions({
                model: modelStub
            });

            await postRevisions.removeAuthorFromRevisions(authorId, options);

            assert.equal(modelStub.bulkEdit.calledOnce, true);

            const bulkEditArgs = modelStub.bulkEdit.getCall(0).args;

            assert.deepEqual(bulkEditArgs[0], ['revision123', 'revision456', 'revision789']);
            assert.equal(bulkEditArgs[1], 'post_revisions');
            assert.deepEqual(bulkEditArgs[2], {
                data: {
                    author_id: null
                },
                column: 'id',
                transacting: options.transacting,
                throwErrors: true
            });
        });

        it('does nothing if there are no post revisions by the provided author', async function () {
            const modelStub = {
                findAll: sinon.stub().resolves({
                    toJSON: () => []
                }),
                bulkEdit: sinon.stub().resolves()
            };
            const postRevisions = new PostRevisions({
                model: modelStub
            });

            await postRevisions.removeAuthorFromRevisions('abc123', {
                transacting: {}
            });

            assert.equal(modelStub.bulkEdit.calledOnce, false);
        });
    });
});
