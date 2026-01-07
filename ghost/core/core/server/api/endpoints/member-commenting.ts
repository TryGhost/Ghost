import membersService from '../../services/members';

const INVALIDATE_MEMBERS_CACHE = {value: '/members/'};

interface DisableFrame {
    options: {
        id: string;
        context: unknown;
    };
    data: {
        reason: string;
        expires_at: Date | null;
    };
}

interface EnableFrame {
    options: {
        id: string;
        context: unknown;
    };
}

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
        async query(frame: DisableFrame) {
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
        async query(frame: EnableFrame) {
            return membersService.api.memberBREADService.enableCommenting(
                frame.options.id,
                frame.options.context
            );
        }
    }
};

// module.exports required - using `export` causes the module to fail to register
// with the web framework as it's loaded via require()
module.exports = controller;
