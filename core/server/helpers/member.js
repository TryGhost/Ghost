// # Members block helper
// Usage: `{{#member}} {{/member}}`
//
const  proxy = require('./proxy');
const labs = proxy.labs;
const SafeString = proxy.SafeString;

// Block helper designed for members context
// module.exports = function member(options) {
//     let ret = '';
//     if (labs.isSet('members')) {
//         let context = {
//             loggedIn: !!options.data.member,
//             memberName: (options.data.member && options.data.member.name) || '',
//             memberEmail: (options.data.email && options.data.member.email) || '',
//         };
//         if (options.data.root.context.includes('post')) {
//             context.restrictedPost = !options.data.root.post.html;
//         }
//         ret = options.fn(Object.assign({}, this, context));
//     }
//     return ret;
// };

// Block helper designed for members context
module.exports = function member(...args) {
    let options = {};
    let prop = '';
    if (args.length === 1) {
        options = args[0];
    } else if (args.length === 2) {
        prop = args[0];
        options = args[1];
    }
    let context = {};
    let ret = '';
    if (labs.isSet('members')) {
        context = {
            loggedIn: !!options.data.member,
            name: (options.data.member && options.data.member.name) || '',
            email: (options.data.email && options.data.member.email) || '',
        };
        if (options.data.root.context.includes('post')) {
            context.restrictedPost = !options.data.root.post.html;
        }
    }
    if (options.fn) {
        ret = options.fn(Object.assign({}, this, {
            member: context
        }));
        return ret;
    }
    return context[prop] || '';
};