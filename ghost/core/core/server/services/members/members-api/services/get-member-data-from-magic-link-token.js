module.exports = function createGetMemberDataFromMagicLinkToken({
    getTokenDataFromMagicLinkToken,
    getMemberIdentityData,
    users,
    Member,
    MemberLoginEvent,
    giftService,
    geolocationService,
    logging
}) {
    return async function getMemberDataFromMagicLinkToken(token, otcVerification) {
        const {email, labels = [], name = '', oldEmail, newsletters, attribution, reqIp, type, giftToken} = await getTokenDataFromMagicLinkToken(token, otcVerification);
        if (!email) {
            return null;
        }

        let member = oldEmail ? await getMemberIdentityData(oldEmail) : await getMemberIdentityData(email);

        if (member) {
            if (oldEmail && (!type || type === 'updateEmail')) {
                // user exists but wants to change their email address
                await users.update({email}, {id: member.id});
                await MemberLoginEvent.add({member_id: member.id});
                return getMemberIdentityData(email);
            }

            if (giftToken) {
                await giftService.service.redeem(giftToken, member.id);
            }

            await MemberLoginEvent.add({member_id: member.id});
            return getMemberIdentityData(member.email);
        }

        // Note: old tokens can still have a missing type (we can remove this after a couple of weeks)
        if (type && !['signup', 'subscribe'].includes(type)) {
            // Don't allow sign up
            // Note that we use the type from inside the magic token so this behaviour can't be changed
            return null;
        }

        let geolocation;
        if (reqIp) {
            try {
                geolocation = JSON.stringify(await geolocationService.getGeolocationFromIP(reqIp));
            } catch (err) {
                logging.warn(err);
                // no-op, we don't want to stop anything working due to
                // geolocation lookup failing
            }
        }

        let newMember;

        if (giftToken) {
            newMember = await Member.transaction(async (transacting) => {
                const created = await users.create(
                    {name, email, labels, newsletters, attribution, geolocation, status: 'gift'},
                    {transacting}
                );
                await giftService.service.redeem(giftToken, created.id, {transacting, newMember: true});
                return created;
            });
        } else {
            newMember = await users.create({name, email, labels, newsletters, attribution, geolocation});
        }

        await MemberLoginEvent.add({member_id: newMember.id});
        return getMemberIdentityData(email);
    };
};
