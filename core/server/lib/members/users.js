module.exports = function ({
    updateMember,
    getMember,
    sendEmail,
    encodeToken,
    decodeToken
}) {
    function requestPasswordReset({email}) {
        return getMember({email}).then((member) => {
            return encodeToken({
                sub: member.id
            }).then((token) => {
                return sendEmail(member, {token});
            });
        }, (/*err*/) => {
            // Ignore user not found err;
        });
    }

    function resetPassword({token, password}) {
        return decodeToken(token).then(({sub}) => {
            return updateMember({id: sub}, {password});
        });
    }

    return {
        requestPasswordReset,
        resetPassword
    };
};
