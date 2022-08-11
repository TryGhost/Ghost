const ObjectId = require('bson-objectid').default;

export function buildComment(override) {
    return {
        id: ObjectId(),
        html: '<p>Empty</p>',
        replies: [],
        count: {
            replies: 0,
            likes: 0
        },
        liked: false,
        created_at: '2022-08-11T09:26:34.000Z',
        edited_at: null,
        member: {
            avatar_image: '',
            bio: 'Head of Testing',
            id: ObjectId(),
            name: 'Test Member',
            uuid: '613e9667-4fa2-4ff4-aa62-507220103d41'
        },
        status: 'published',
        ...override
    };
}

export function buildReply(override) {
    return {
        id: ObjectId(),
        html: '<p>Empty</p>',
        count: {
            likes: 0
        },
        liked: false,
        created_at: '2022-08-11T09:26:34.000Z',
        edited_at: null,
        member: {
            avatar_image: '',
            bio: 'Head of Testing',
            id: ObjectId(),
            name: 'Test Member',
            uuid: '613e9667-4fa2-4ff4-aa62-507220103d41'
        },
        status: 'published',
        ...override
    };
}
