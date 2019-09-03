module.exports = function ({
    createMember,
    getMember,
    listMembers,
    deleteMember
}) {
    return {
        create: createMember,
        list: listMembers,
        get: getMember,
        destroy: deleteMember
    };
};
