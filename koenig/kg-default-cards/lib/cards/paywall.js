module.exports = {
    name: 'hr',
    type: 'dom',

    render({env: {dom}}) {
        return dom.createComment('members-only');
    }
};
