const common = require('../lib/common');
const membersService = require('./members');
const bulkEmailService = require('./bulk-email');

const sendEmail = async (post) => {
    const emailTmpl = {
        subject: post.title, // NOTE: add configurable title here
        html: post.plaintext
    };

    const emails = await membersService.listMembers().map(m => m.email);

    return bulkEmailService.send(emailTmpl, emails);
};

function listener(model, options) {
    // CASE: do not ping slack if we import a database
    // TODO: refactor post.published events to never fire on importing
    if (options && options.importing) {
        return;
    }

    if (!model.get('send_email_when_published')) {
        return;
    }

    sendEmail(model.toJSON());
}

function listen() {
    common.events.on('post.published', listener);
}

// Public API
module.exports = {
    listen: listen
};
