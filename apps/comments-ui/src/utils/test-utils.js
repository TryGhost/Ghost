const ObjectId = require('bson-objectid').default;
let memberCounter = 0;

export function buildMember(override) {
    memberCounter += 1;

    return {
        avatar_image: 'https://www.gravatar.com/avatar/7a68f69cc9c9e9b45d97ecad6f24184a?s=250&r=g&d=blank',
        expertise: 'Head of Testing',
        id: ObjectId(),
        name: 'Test Member ' + memberCounter,
        uuid: ObjectId(),
        paid: false,
        ...override
    };
}

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
        member: buildMember(),
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
        member: buildMember(),
        status: 'published',
        ...override
    };
}
