const path = require('path');
const config = require('../../../../config');
const common = require('../../../../lib/common');
const themes = require('../../../../../frontend/services/themes');

// we only use /images/members/avatar/default/ right now but we have future scope
// for using member UUIDs in place of 'default' for member-uploaded avatars
const MEMBER_AVATAR_PATH_REGEX = /^\/members\/avatar\/(default)\/$/;

module.exports = function handleMemberAvatars(req, res, next) {
    if (!MEMBER_AVATAR_PATH_REGEX.test(req.url)) {
        return next();
    }

    const [, memberUUID] = req.url.match(MEMBER_AVATAR_PATH_REGEX);

    if (memberUUID === 'default') {
        let filePath = path.join(config.get('paths').publicFilePath, 'default-member-avatar.png');

        if (themes.getActive().hasFile('assets/default-member-avatar.png')) {
            filePath = path.join(themes.getActive().path, 'assets/default-member-avatar.png');
        }

        return res.sendFile(filePath, function (err) {
            if (err) {
                // ensure we're triggering basic 404 and not a templated 404
                if (err.status === 404) {
                    return next(new common.errors.NotFoundError({
                        message: common.i18n.t('errors.errors.imageNotFound'),
                        code: 'STATIC_FILE_NOT_FOUND',
                        property: err.path
                    }));
                }

                return next(err);
            }
        });
    }

    return next();
};
