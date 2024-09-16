const ObjectId = require('bson-objectid').default;
let memberCounter = 0;

export function buildMember(override: any = {}) {
    memberCounter += 1;

    return {
        id: ObjectId().toString(),
        avatar_image: 'https://www.gravatar.com/avatar/7a68f69cc9c9e9b45d97ecad6f24184a?s=250&r=g&d=blank',
        expertise: 'Head of Testing',
        name: 'Test Member ' + memberCounter,
        uuid: ObjectId().toString(),
        paid: override.status === 'paid',
        status: 'free',
        ...override
    };
}

export function buildSettings(override: any = {}) {
    return {
        meta: {},
        settings: {},
        ...override
    };
}

export function buildComment(override: any = {}) {
    return {
        id: ObjectId().toString(),
        html: '<p>Empty</p>',
        replies: [],
        liked: false,
        created_at: '2022-08-11T09:26:34.000Z',
        edited_at: null,
        member: buildMember(),
        status: 'published',
        ...override,
        count: {
            replies: 0,
            likes: 0,
            ...override.count
        }
    };
}

export function buildReply(override: any = {}) {
    return {
        id: ObjectId().toString(),
        html: '<p>Empty</p>',
        count: {
            likes: 0
        },
        liked: false,
        created_at: '2022-08-11T09:26:34.000Z',
        edited_at: null,
        member: buildMember(),
        status: 'published',
        ...override
    };
}

export function buildCommentsReply(override: any = {}) {
    return {
        comments: [],
        meta: {
            pagination: {
                pages: 1,
                total: 0,
                page: 1,
                limit: 5
            }
        }
    };
}
