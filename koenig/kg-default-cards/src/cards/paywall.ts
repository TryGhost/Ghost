module.exports = {
    name: 'paywall',
    type: 'dom',

    render({env: {dom}}) {
        return dom.createComment('members-only');
    }
};
