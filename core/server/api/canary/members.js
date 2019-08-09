// NOTE: We must not cache references to membersService.api
// as it is a getter and may change during runtime.
const membersService = require('../../services/members');

const members = {
    docName: 'members',
    browse: {
        options: [
            'limit',
            'fields',
            'filter',
            'order',
            'debug',
            'page'
        ],
        permissions: true,
        validation: {},
        query(frame) {
            return membersService.api.members.list(frame.options);
        }
    },

    read: {
        headers: {},
        data: [
            'id',
            'email'
        ],
        validation: {},
        permissions: true,
        query(frame) {
            return membersService.api.members.get(frame.data, frame.options);
        }
    },

    destroy: {
        statusCode: 204,
        headers: {},
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
        permissions: true,
        query(frame) {
            frame.options.require = true;
            return membersService.api.members.destroy(frame.options).return(null);
        }
    }
};

module.exports = members;
