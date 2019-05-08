// # Members helper
// Usage: `{{#member}} {{/member}}`
// OR `{{member 'property'}}`
//
const  proxy = require('./proxy');
const labs = proxy.labs;
const SafeString = proxy.SafeString;

// Block helper designed for members context
module.exports = function member(...args) {
    if (args.length < 1) {
        return null;
    }
    let options = args[args.length - 1];
    let prop = '';
    let context = {};
    if (args.length === 2) {
        prop = args[0];
    }
    if (labs.isSet('members')) {
        context = {
            isLoggedIn: !!options.data.member,
            name: (options.data.member && options.data.member.name) || '',
            email: (options.data.email && options.data.member.email) || '',
        };
        if (options.data.root.context.includes('post')) {
            context.isRestrictedPost = !options.data.root.post.html;
        }
    }
    if (options.fn) {
        return options.fn(Object.assign({}, this, {
            member: context
        }));
    }
    return context[prop] || '';
};