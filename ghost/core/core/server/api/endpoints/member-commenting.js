const membersService = require('../../services/members');

const INVALIDATE_MEMBERS_CACHE = {value: '/members/'};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'member_commenting',

    disable: {
        statusCode: 200,
        headers: {
            cacheInvalidate: INVALIDATE_MEMBERS_CACHE
        },
        options: [
            'id'
        ],
        data: [
            'reason',
            'expires_at'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'edit',
            docName: 'member'
        },
        async query(frame) {
            return membersService.api.memberBREADService.disableCommenting(
                frame.options.id,
                frame.data.reason,
                frame.data.expires_at || null,
                frame.options.context
            );
        }
    },

    enable: {
        statusCode: 200,
        headers: {
            cacheInvalidate: INVALIDATE_MEMBERS_CACHE
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'edit',
            docName: 'member'
        },
        async query(frame) {
            return membersService.api.memberBREADService.enableCommenting(
                frame.options.id,
                frame.options.context
            );
        }
    }
};

module.exports = controller;
