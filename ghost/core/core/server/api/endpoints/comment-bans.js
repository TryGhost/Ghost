const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const ObjectId = require('bson-objectid').default;

const messages = {
    memberNotFound: 'Member not found',
    banNotFound: 'Ban not found'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'comment_bans',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'member_id'
        ],
        validation: {
            options: {
                member_id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        async query(frame) {
            // Verify member exists
            const member = await models.Member.findOne({id: frame.options.member_id});
            if (!member) {
                throw new errors.NotFoundError({
                    message: tpl(messages.memberNotFound)
                });
            }

            // Only return active bans (not soft-deleted)
            const bans = await models.MemberCommentBan.query((qb) => {
                qb.where('member_id', frame.options.member_id)
                    .whereNull('deleted_at')
                    .orderBy('created_at', 'DESC');
            }).fetchAll();

            // Return in format expected by default serializer
            return {data: bans.models};
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'member_id'
        ],
        validation: {
            options: {
                member_id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'members',
            method: 'edit'
        },
        async query(frame) {
            // Verify member exists
            const member = await models.Member.findOne({id: frame.options.member_id});
            if (!member) {
                throw new errors.NotFoundError({
                    message: tpl(messages.memberNotFound)
                });
            }

            const banData = frame.data.comment_bans[0];

            // Create the ban
            const ban = await models.MemberCommentBan.add({
                id: ObjectId().toHexString(),
                member_id: frame.options.member_id,
                reason: banData.reason,
                expires_at: banData.expires_at
            }, frame.options);

            return ban;
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'member_id',
            'id'
        ],
        validation: {
            options: {
                member_id: {
                    required: true
                },
                id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'members',
            method: 'edit'
        },
        async query(frame) {
            // Verify member exists
            const member = await models.Member.findOne({id: frame.options.member_id});
            if (!member) {
                throw new errors.NotFoundError({
                    message: tpl(messages.memberNotFound)
                });
            }

            // Verify ban exists and belongs to this member
            const ban = await models.MemberCommentBan.findOne({
                id: frame.options.id,
                member_id: frame.options.member_id
            });

            if (!ban) {
                throw new errors.NotFoundError({
                    message: tpl(messages.banNotFound)
                });
            }

            // Soft delete by setting deleted_at to preserve history
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

            await models.Base.knex('members_comment_bans')
                .where('id', frame.options.id)
                .update({
                    deleted_at: now,
                    updated_at: now
                });

            return null;
        }
    }
};

module.exports = controller;
