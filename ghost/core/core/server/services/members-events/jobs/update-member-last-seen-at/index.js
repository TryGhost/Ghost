const db = require('../../../../data/db');
const errors = require('@tryghost/errors');
const moment = require('moment-timezone');
module.exports = async function updateMemberLastSeenAt(data) {
    const result = await db.knex.transaction(async (trx) => {
        // To avoid a race condition, we lock the member row for update, then the last_seen_at field again to prevent simultaneous updates
        const currentMember = await trx('members')
            .where({id: data.memberId})
            .forUpdate()
            .first();

        if (!currentMember) {
            throw new errors.NotFoundError({message: `Member with id ${data.memberId} not found`});
        }

        const currentMemberLastSeenAt = currentMember.last_seen_at;
        if (currentMemberLastSeenAt === null || moment(moment.utc(data.timestamp).tz(data.timezone).startOf('day')).isAfter(currentMemberLastSeenAt)) {
            await trx('members')
                .where({id: data.memberId})
                .update({
                    last_seen_at: moment.utc(data.timestamp).format('YYYY-MM-DD HH:mm:ss')
                });

            // Fetch the updated member data
            const updatedMember = await trx('members')
                .where({id: data.memberId})
                .first();

            // Return data for the job manager to emit the event
            const eventData = {
                nodeEvents: [{
                    name: 'member.edited',
                    data: updatedMember
                }]
            };

            return {result: updatedMember, eventData};
        }
        return undefined;
    });
    return result;
};