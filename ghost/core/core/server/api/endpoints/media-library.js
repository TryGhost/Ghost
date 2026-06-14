const mediaInventory = require('../../services/media-inventory');
const labs = require('../../../shared/labs');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    noPermission: 'You do not have permission to browse the media library.'
};

// Roles that see media from every post. Everyone else (Author, Contributor) is
// scoped to posts they author, mirroring Ghost's own post visibility: the admin
// post list narrows Authors/Contributors to `authors:<slug>` while these roles
// see all (see ghost/admin/app/routes/posts.js).
const ELEVATED_ROLES = ['Owner', 'Administrator', 'Editor', 'Super Editor'];

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'media_library',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'limit',
            'type'
        ],
        validation: {
            options: {
                type: {
                    values: ['image', 'media', 'file']
                }
            }
        },
        // Available to every staff role. Elevated roles browse all media;
        // Author/Contributor are scoped to their own posts (set below and applied
        // by the service). Integration tokens have no user to scope against, so
        // they are denied.
        async permissions(frame) {
            // Private feature: when the flag is off the endpoint does not exist,
            // so the content scan is unreachable even to an authorised user.
            if (!labs.isSet('mediaLibrary')) {
                throw new errors.NotFoundError();
            }

            // frame.user is the authenticated staff model; integration tokens
            // (and any non-HTTP context, where the frame defaults user to {}) have
            // no usable user, so deny before touching it.
            if (!frame.user || typeof frame.user.hasRole !== 'function') {
                throw new errors.NoPermissionError({message: tpl(messages.noPermission)});
            }

            await frame.user.load(['roles']);

            const elevated = ELEVATED_ROLES.some(role => frame.user.hasRole(role));
            if (!elevated) {
                // Scope the scan to this user's own posts. Set on options so the
                // service applies it; reuses the already-loaded user.
                frame.options.authorId = frame.user.id;
            }
        },
        query(frame) {
            return mediaInventory.api.getInUseMedia(frame.options);
        }
    }
};

module.exports = controller;
