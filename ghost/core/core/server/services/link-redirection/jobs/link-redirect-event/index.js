const db = require('../../../../data/db');
const errors = require('@tryghost/errors');
const moment = require('moment-timezone');
const ObjectID = require('bson-objectid').default;

module.exports = async function handleRedirect(data) {
    console.log('handleRedirect', data);
    const {uuid, linkId, timestamp, timezone} = data;
    const member = await db.knex.select('id').from('members').where('uuid', uuid).first();
    if (!member) {
        return; // throwing error causes the job to fail and be retried
        // throw new errors.NotFoundError({message: `Member with uuid ${uuid} not found`});
    }
    // const formattedTimestamp = new Date(timestamp).toISOString(); // for sqlite support
    try {
        await handleMemberLinkClick({memberId: member.id, linkId, timestamp});
        await handleLastSeenAtUpdate({memberId: member.id, timestamp, timezone});
    } catch (error) {
        console.error(error);
    }
};

const handleMemberLinkClick = async ({memberId, linkId, timestamp}) => {
    // Create a Date object from the timestamp
    const date = new Date(timestamp);

    // Format the date to 'YYYY-MM-DD HH:MM:SS' in UTC
    const formattedTimestamp = date.getUTCFullYear() + '-' +
        String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(date.getUTCDate()).padStart(2, '0') + ' ' +
        String(date.getUTCHours()).padStart(2, '0') + ':' +
        String(date.getUTCMinutes()).padStart(2, '0') + ':' +
        String(date.getUTCSeconds()).padStart(2, '0');

    return await db.knex('members_click_events')
        .insert({
            id: new ObjectID().toHexString(),
            created_at: formattedTimestamp,
            member_id: memberId,
            redirect_id: linkId
        });
};

const handleLastSeenAtUpdate = async (data) => {
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
