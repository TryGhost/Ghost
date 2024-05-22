const sinon = require('sinon');
const models = require('../../../../core/server/models');
const testUtils = require('../../../utils');

describe('Unit: models/comment', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('permissible', function () {
        function getCommentModel(id, memberId) {
            const obj = {
                id: id,
                member_id: memberId
            };

            return {
                id: obj.id,
                get: sinon.stub().callsFake((prop) => {
                    return obj[prop];
                })
            };
        }

        it('user can do all', async function () {
            const comment = getCommentModel(1, 'member_123');
            const context = {user: 1};

            const response = await models.Comment.permissible(comment, 'destroy', context, {}, testUtils.permissions.owner, true, true, true);
            response.should.eql(true);
        });

        it('can only edit own comments', async function () {
            const comment = getCommentModel(1, 'member_123');
            const context = {
                member: {
                    id: 'other_member'
                }
            };

            try {
                const response = await models.Comment.permissible(comment, 'edit', context, {}, null, false, true, true);
                response.should.eql(true);
            } catch (err) {
                err.message.should.eql('You may only edit your own comments');
                return;
            }
            throw new Error('Should throw');
        });

        it('can edit own comments', async function () {
            const comment = getCommentModel(1, 'member_123');
            const context = {
                member: {
                    id: 'member_123'
                }
            };

            await models.Comment.permissible(comment, 'edit', context, {}, null, false, true, true);
        });

        it('can only destroy own comments', async function () {
            const comment = getCommentModel(1, 'member_123');
            const context = {
                member: {
                    id: 'other_member'
                }
            };

            try {
                const response = await models.Comment.permissible(comment, 'destroy', context, {}, null, false, true, true);
                response.should.eql(true);
            } catch (err) {
                err.message.should.eql('You may only delete your own comments');
                return;
            }
            throw new Error('Should throw');
        });

        it('can edit destroy comments', async function () {
            const comment = getCommentModel(1, 'member_123');
            const context = {
                member: {
                    id: 'member_123'
                }
            };

            await models.Comment.permissible(comment, 'destroy', context, {}, null, false, true, true);
        });
    });
});
