const semver = require('semver');

module.exports = function (inputString = '', {ghostVersion = '4.0', type = 'mobiledoc'} = {}) {
    const version = semver.coerce(ghostVersion);

    if (typeof inputString !== 'string' || (inputString || '').trim() === '') {
        return '';
    }

    if (semver.satisfies(version, '<4.x')) {
        if (type === 'markdown') {
            // backwards compatible slugs used in Ghost 0.x to 3.x markdown
            return inputString.replace(/[^\w]/g, '').toLowerCase();
        } else {
            // backwards compatible slugs used in Ghost 2.x to 3.x mobiledoc
            return inputString.replace(/[<>&"?]/g, '')
                .trim()
                .replace(/[^\w]/g, '-')
                .replace(/-{2,}/g, '-')
                .toLowerCase();
        }
    } else {
        // new slugs introduced in 4.0
        // allows all chars except symbols but will urlEncode everything
        // produces %-encoded chars in src but browsers show real chars in status bar and url bar
        return encodeURIComponent(inputString.trim()
            .toLowerCase()
            .replace(/[\][!"#$%&'()*+,./:;<=>?@\\^_{|}~]/g, '')
            .replace(/\s+/g, '-')
            .replace(/^-|-{2,}|-$/g, '')
        );
    }
};
