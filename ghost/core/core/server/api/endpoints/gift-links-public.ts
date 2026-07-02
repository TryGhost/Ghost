import {service} from '../../services/gift-links';

const errors = require('@tryghost/errors');

interface Frame {
    options: {
        token: string;
        [key: string]: unknown;
    };
}

const controller = {
    docName: 'gift_links',

    read: {
        headers: {cacheInvalidate: false},
        options: ['token'],
        validation: {options: {token: {required: true}}},
        permissions: true,
        async query(frame: Frame) {
            const post = await service!.getPostByToken(frame.options.token);
            if (!post) {
                throw new errors.NotFoundError({message: 'Gift link not found.'});
            }
            return post;
        }
    }
};

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
