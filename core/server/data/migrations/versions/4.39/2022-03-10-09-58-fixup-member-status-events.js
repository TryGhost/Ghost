const DatabaseInfo = require('@tryghost/database-info');
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

const migrationMethods = {
    fixAll,
    deleteUnchangedEvents,
    deleteDuplicateEvents,
    eliminateWrongNullOrdering,
    mergeTwoEvents,
    mergeEventsWithSameToStatus,
    mergeEventsWithSameFromStatus,
    mergeEventsWithSameTime,
    linkIncorrectEvents,
    fixFirstStatus,
    fixLastStatus,
    replaceUnknownStatuses
};

// We also export some methods so we can use them in our tests
module.exports = {
    ...migrationMethods,
    ...createTransactionalMigration(
        async function up(knex) {
            if (DatabaseInfo.isSQLite(knex)) {
                logging.warn('Not able to fix member status events in SQLite - skipping migration');
                return;
            }

            await fixAll(knex);
        },
        async function down(knex) {
            if (DatabaseInfo.isSQLite(knex)) {
                return;
            }

            // We can't support a down operation for this migration since we delete and update events without keeping a backup
            logging.warn(`Down migration not supported for fixup-member-status-events`);
        }
    )
};

// HELPER METHODS

/**
 * Delete all member_status_events that have from_status = to_status
 * @param {import('knex')} knex
 */
async function deleteUnchangedEvents(knex) {
    const deletedRows = await knex('members_status_events').where('from_status', knex.ref('to_status')).del();
    logging.info(`Deleted ${deletedRows} unchanged member_status_events events`);
    return deletedRows;
}

/**
 * Delete all member_status_events that have same created_at, member_id, from_status, and to_status
 * -> but keep one (we keep the one with the 'greatest' ID)
 *  * 
 * @param {import('knex')} knex
 */
async function deleteDuplicateEvents(knex) {
    const subquery = knex.select('B.id as id')
        .from('members_status_events as A')
        .join('members_status_events as B', function () {
            this.on('A.member_id', '=', 'B.member_id')
                .andOn('A.created_at', '=', 'B.created_at')
                .andOn('A.id', '>', 'B.id')
                // We need NULL safe equal checking here
                .andOn(knex.raw(`A.from_status <=> B.from_status`))
                .andOn(knex.raw(`A.to_status <=> B.to_status`));
        });

    const result = await knex.raw(`DELETE A FROM members_status_events AS A, (${subquery.toString()}) AS B WHERE A.id = B.id`);
    const deletedRows = result[0].affectedRows;

    logging.info(`Deleted ${deletedRows} duplicate member_status_events events`);
    return deletedRows;
}

/**
 * We can have events that are in the wrong order, E.g. first (free -> paid) then (NULL -> free). The created_at can be the same, but it is also possible that the first event has an earlier created_at
 * To fix this, we'll set the created_at for all these events to the one of the event that conains NULL (which is technically the first). But we keep the different from and to statusses. Then we'll eliminate these duplicates in an other step.
 * @param {import('knex')} knex
 * @returns {Promise<number>} Deleted rows
 */
async function eliminateWrongNullOrdering(knex) {
    const subquery = 
        `SELECT
            A.id,
            B.created_at
        FROM
            members_status_events A
        JOIN members_status_events B 
            ON B.id != A.id
            AND A.member_id = B.member_id
            AND A.created_at < B.created_at
            AND B.from_status is NULL`;

    const result = await knex.raw(
        `UPDATE 
            members_status_events AS A, 
            (${subquery}) AS B 
        SET A.created_at = B.created_at 
        WHERE A.id = B.id`
    );

    const updatedRows = result[0].affectedRows;

    logging.info(`Updated ${updatedRows} rows to match the same created_at as the first NULL event`);

    if (updatedRows > 0) {
        // Possible that we now have multiple (NULL -> A), (NULL -> A)
        await deleteDuplicateEvents(knex);
    }

    return updatedRows;
}

/**
 * Merge two events that have the same created_at, and member_id and only if they fit nicely, so (A -> B), (B -> D) into (A -> D)
 * But we need to make sure that the same event is only involved in a merge once during this query, so don't try to merge (A -> B) into (B -> D) as well as (B -> C) (because then we would loose one event)
 * @param {import('knex')} knex
 * @returns {Promise<number>} Deleted rows
 */
async function mergeTwoEvents(knex) {
    const subquery = 
        `SELECT
            A.member_id,
            A.created_at,
            A.id AS FIRST_ID,
            B.id AS SECOND_ID,
            A.from_status,
            B.to_status
        FROM
            members_status_events A
            JOIN members_status_events B 
                ON B.id != A.id
                AND A.member_id = B.member_id
                AND A.created_at = B.created_at
        WHERE
            B.from_status = A.to_status`; 

    // We use the above subquery twice because we need only to keep one event per member_id/created_at that we'll merge
    const deduplicated =
        `WITH subquery AS(${subquery}) 
        SELECT 
            A.*
        FROM subquery A
        LEFT JOIN subquery B 
            ON B.member_id = A.member_id
            AND B.created_at = A.created_at
            AND CONCAT(A.FIRST_ID, A.SECOND_ID) > CONCAT(B.FIRST_ID, B.SECOND_ID)
        WHERE B.FIRST_ID is NULL`;

    const result = await knex.raw(
        `UPDATE 
            members_status_events AS A, 
            (${deduplicated}) AS B 
        SET 
            A.from_status = B.from_status, 
            A.to_status = B.to_status 
        WHERE 
            A.id = B.FIRST_ID 
            OR A.id = B.SECOND_ID`
    );
    const updatedRows = result[0].affectedRows;

    logging.info(`Updated ${updatedRows} rows, (A -> B), (B -> D) into (A -> D), (A -> D)`);

    if (updatedRows > 0) {
        // Now delete one of the matching rows
        await deleteDuplicateEvents(knex);
    }

    return updatedRows;
}

/**
 * Merge multiple events with the same created_at and member_id, and that have the same from_status into one event with their from_status and to_status = unknown
 * @param {import('knex')} knex
 * @returns {Promise<number>} Deleted rows
 */
async function mergeEventsWithSameFromStatus(knex) {
    const subquery = 
        `SELECT
            A.id
        FROM
            members_status_events A
        LEFT JOIN members_status_events B 
            ON B.id != A.id
            AND A.member_id = B.member_id
            AND A.created_at = B.created_at
            AND A.from_status != B.from_status
        JOIN members_status_events C 
            ON C.id != A.id
            AND A.member_id = C.member_id
            AND A.created_at = C.created_at
            AND A.from_status <=> C.from_status
        WHERE
            B.id is null`;

    const result = await knex.raw(
        `UPDATE 
            members_status_events AS A, 
            (${subquery}) AS B 
        SET A.to_status = ? 
        WHERE A.id = B.id`, 
        ['unknown']
    );
    const updatedRows = result[0].affectedRows;

    logging.info(`Updated ${updatedRows} rows, (A -> B), (A -> D) into (A -> unknown), (A -> unknown)`);

    if (updatedRows > 0) {
        // Now delete one of the matching rows
        await deleteDuplicateEvents(knex);
    }

    return updatedRows;
}

/**
 * Merge multiple events with the same created_at and member_id, and that have the same to_status into one event with their to_status and from_status = unknown
 * @param {import('knex')} knex
 * @returns {Promise<number>} Deleted rows
 */
async function mergeEventsWithSameToStatus(knex) {
    const subquery = 
        `SELECT
            A.id
        FROM
            members_status_events A
        LEFT JOIN members_status_events B 
            ON B.id != A.id
            AND A.member_id = B.member_id
            AND A.created_at = B.created_at
            AND A.to_status != B.to_status
        JOIN members_status_events C 
            ON C.id != A.id
            AND A.member_id = C.member_id
            AND A.created_at = C.created_at
            AND A.to_status <=> C.to_status
        WHERE
            B.id is null`;
    const result = await knex.raw(`UPDATE members_status_events AS A, (${subquery}) AS B SET A.from_status = ? WHERE A.id = B.id`, ['unknown']);
    const updatedRows = result[0].affectedRows;

    logging.info(`Updated ${updatedRows} rows, (C -> A), (B -> A) into (unknown -> A), (unknown -> A)`);

    if (updatedRows > 0) {
        // Now delete one of the matching rows
        await deleteDuplicateEvents(knex);
    }

    return updatedRows;
}

/**
 * Merge multiple events with the same created_at and member_id into one event (unknown -> unknown)
 * @param {import('knex')} knex
 * @returns {Promise<number>} Deleted rows
 */
async function mergeEventsWithSameTime(knex) {
    const subquery = 
        `SELECT
            A.id
        FROM
            members_status_events A
        JOIN members_status_events B 
            ON B.id != A.id
            AND A.member_id = B.member_id
            AND A.created_at = B.created_at`;

    const result = await knex.raw(
        `UPDATE 
            members_status_events AS A, 
            (${subquery}) AS B 
        SET 
            A.from_status = ?, 
            A.to_status = ? 
        WHERE A.id = B.id`, 
        ['unknown', 'unknown']
    );
    const updatedRows = result[0].affectedRows;

    logging.info(`Updated ${updatedRows} rows, (C -> A), (B -> D) into (unknown -> unknown), (unknown -> unknown)`);

    if (updatedRows > 0) {
        // Now delete one of the matching rows
        await deleteDuplicateEvents(knex);
    }

    return updatedRows;
}

/**
 * Fix events that don't match by setting the from_status from the to_status of the previous event
 * @param {import('knex')} knex
 * @returns {Promise<number>} Updated rows
 */
async function linkIncorrectEvents(knex, set = 'from_status') {
    // This query selects the minimum created_at of all events (with same member_id) that follow given event A
    // This is needed to find the next event (we already know that created_at is unique for the same members because we eliminated duplicate created_at events in previous steps)
    const minquery = `SELECT
        A.id,
        A.to_status,
        A.member_id,
        min(B.created_at) AS next_created_at
    FROM
        members_status_events A
        JOIN members_status_events B 
            ON A.member_id = B.member_id
            AND B.created_at > A.created_at
        GROUP BY
            A.id`;

    // Select one event A, and the next event B in subquery using minquery
    // where the from_status and to_status don't match (NULL SAFE)
    const subquery = `SELECT 
        A.id as FIRST_ID,
        B.id as LAST_ID,
        A.to_status as to_status,
        B.from_status as from_status
    FROM 
        (${minquery}) as A
        JOIN members_status_events B
            ON A.member_id = B.member_id
            AND A.id != B.id
            AND B.created_at = A.next_created_at
    WHERE
        NOT (A.to_status <=> B.from_status)`;

    let result;
    let updatedRows;

    if (set === 'from_status') {
        result = await knex.raw(
            `UPDATE 
                members_status_events AS A, 
                (${subquery}) AS B 
            SET A.from_status = B.to_status 
            WHERE 
                A.id = B.LAST_ID 
                AND B.to_status != ?`, 
            ['unknown']
        );
        updatedRows = result[0].affectedRows;
        logging.info(`Updated ${updatedRows} events to set from_status to to_status of the previous event`);
    } else {
        result = await knex.raw(
            `UPDATE 
                members_status_events AS A, 
                (${subquery}) AS B 
            SET A.to_status = B.from_status 
            WHERE 
                A.id = B.FIRST_ID 
                AND B.from_status != ?`,
            ['unknown']
        );
        updatedRows = result[0].affectedRows;
        logging.info(`Updated ${updatedRows} events to set to_status to from_status of the next event`);
    }

    return updatedRows;
}

/**
 * Set last event status for a member to the current member status
 * @param {import('knex')} knex
 * @returns {Promise<number>} Updated rows
 */
async function fixLastStatus(knex) {
    // Get the last created_at for each member
    const maxquery = 
        `SELECT
            members.id,
            members.status,
            max(members_status_events.created_at) AS last_event_created_at
        FROM
            members
        JOIN members_status_events 
            ON members_status_events.member_id = members.id
        GROUP BY
            members.id`;
        
    // Select the members_status_events.id of the last member event, and corresponding member status
    const subquery = 
        `SELECT
            A.id,
            B.status
        FROM
            members_status_events A
            JOIN (${maxquery}) B 
                ON B.id = A.member_id
                AND A.created_at = B.last_event_created_at
        WHERE
            A.to_status != B.status`;

    const result = await knex.raw(
        `UPDATE 
            members_status_events AS A, 
            (${subquery}) AS B 
        SET A.to_status = B.status 
        WHERE
            A.id = B.id`
    );
    const updatedRows = result[0].affectedRows;
    logging.info(`Updated ${updatedRows} events to match current member status`);

    return updatedRows;
}

/**
 * Set first event status for a member to NULL
 * @param {import('knex')} knex
 * @returns {Promise<number>} Updated rows
 */
async function fixFirstStatus(knex) {
    // Get the first created_at for each member
    const minquery = 
        `SELECT
            members.id,
            min(members_status_events.created_at) AS first_event_created_at
        FROM
            members
        JOIN members_status_events 
            ON members_status_events.member_id = members.id
        GROUP BY
            members.id`;
        
    const result = await knex.raw(
        `UPDATE 
            members_status_events AS A, 
            (${minquery}) AS B 
        SET A.from_status = NULL
        WHERE
            A.member_id = B.id
            AND A.created_at = B.first_event_created_at`
    );
    const updatedRows = result[0].affectedRows;
    logging.info(`Updated ${updatedRows} first events to always have from_status = NULL`);

    // Fix members that don't have a first event

    return updatedRows;
}

/**
 * Set last event status for a member to the current member status
 * @param {import('knex')} knex
 * @returns {Promise<number>} Updated rows
 */
async function replaceUnknownStatuses(knex, status = 'free') {
    const result = await knex.raw(
        `UPDATE 
            members_status_events
        SET to_status = ?
        WHERE to_status = ?`,
        [status, 'unknown']
    );

    const updatedRows = result[0].affectedRows;
    logging.info(`Updated ${updatedRows} events that still had an unknown to_status to ${status}`);

    const result2 = await knex.raw(
        `UPDATE 
            members_status_events
        SET from_status = ?
        WHERE from_status = ?`,
        [status, 'unknown']
    );

    const updatedRows2 = result2[0].affectedRows;
    logging.info(`Updated ${updatedRows2} events that still had an unknown from_status to ${status}`);

    return updatedRows + updatedRows2;
}

/**
 * @param {import('knex')} knex
 */
async function fixAll(knex) {
    // STEP
    // resolve all events that have the same created_at for the same member into a single event
    // This is required to have one indisputable ordering of all the events that helps us resolve the inconsistencies
    // To make sure we resolve these same-time-events the right way, we first need to make sure the initial data set is as correct as possible:
    // - Delete duplicate events (same created_at, member_id, from_status, and to_status)
    // - Delete unchanged events (from_status = to_status)
    // During our whole fixup process, we might create situations where we create duplicate events, so we are going to do that action again after some steps.

    //await deleteUnchangedEvents(knex);
    await deleteDuplicateEvents(knex);

    // STEP
    // We can have events that are in the wrong order, E.g. first (free -> paid) then (NULL -> free). The created_at can be the same, but it is also possible that the first event has an earlier created_at
    // To fix this, we'll set the created_at for all these events to the one of the event that conains NULL. Then we'll eliminate these duplicates in the next step.
    // So in our example (free -> paid) then (NULL -> free), will become one single (NULL -> paid) event in the next step
    await eliminateWrongNullOrdering(knex);

    // STEP
    // How to resolve events with the same created_at and member_id?
    // Initial way to resolve these kind of issues is to search for a pattern in duplicates:
    // Given two events (A -> B), (B -> C), we can transform it into one event (A -> C), 
    // OR (A -> B), (B -> A), we can transform it into one event (A -> A) and delete it in the next step
    // What if there are 3+ events with the same created_at? 
    // E.g., (A -> B), (B -> C), (C -> A), (C -> B): could be resolved to (A -> B), (A -> A), (B -> B)..., we cannot know sometimes
    // Solution: create a new temporary status: 'unknown' that we are going to use during the migration.
    // So in this case, it should create (unknown -> unknown)
    // If we find a next event with a from_status, we can just set that unknown status to the known from_status of the next event (if that is not also unknown)
    // That way, we don't loose the timing of this status change and we still have some chance to correct it without losing data
    // 
    // What about two events (A -> B), (A -> D)? This should be (A -> unknown). If we later find a status (B -> D), we know for sure that unknown is B in this case.
    // What about two events (A -> B), (D -> A)? This should be (unknown -> unknown)
    //
    // General rules (in the right order): 
    // - if we have two events that fit nicely together, we take the first event from_status, and the last event's to_status. Delete the event if it becomes an unchanged event (A -> A)
    // - If one of the events has a from_status === NULL, then we'll set the from_status of all the events to NULL, and to_status should be unknown (to_status will always differ or the duplicates would have been deleted)
    // - if all events have the same from_status, from_status should be kept, and to_status should be unknown
    // - if all events have the same to_status, to_status should be kept, and to_status should be unknown
    // - all other situations: (unknown -> unknown)
    // - to_status and from_status can't be the same in events because we deleted duplicate events earlier
    //
    // EXAMPLES:
    // Given 4 events that fit nicely (A -> B), (B -> C), (C -> B), (B -> C), we should transform it into one event (A -> C) using multiple steps:
    // (A -> B), (B -> C) -> (A -> C)
    // (A -> C), (C -> B) -> (A -> B)
    // (A -> B), (B -> C) -> (A -> C)
    //
    // Given 3 events that don't fit nicely (A -> B), (B -> C), (A -> D), we should transform it into one event (A -> unknown) using multiple steps:
    // (A -> B), (B -> C) -> (A -> C)
    // (A -> C), (A -> D) -> (A -> unknown)
    //
    // Given 4 events that fit nicely only if processed in the correct order (A -> B), (B -> D), (D -> B), (B -> C), we should transform it into one event (A -> C)
    // Other order: (A -> B), (B -> C), (B -> D), (D -> B), we would have transformed it into (A -> C), (B -> D), (D -> B), and so (A -> C), (B -> B) and so (A -> C)
    // 

    // Repeat first step until the changed rows is zero
    let count = 0;
    const MAX_LOOPS = 5;

    // eslint-disable-next-line no-restricted-syntax
    while (count < MAX_LOOPS && await mergeTwoEvents(knex) > 0) {
        count += 1;
    }
    if (count >= MAX_LOOPS) {
        logging.warn('Had to cancel mergeTwoEvents too early because of too many loops');
    }

    // @todo: If one of the events has a from_status === NULL, then we'll set the from_status of all the events to NULL, and to_status should be unknown (to_status will always differ or the duplicates would have been deleted)
    // not sure if that is needed, because we'll always make sure the first event status is NULL in one of the next steps

    await mergeEventsWithSameFromStatus(knex);
    await mergeEventsWithSameToStatus(knex);
    await mergeEventsWithSameTime(knex);

    // Right now we don't have any events left that share the same created_at for the same member_id
    // So we have one indisputable ordering of all events.

    // STEP
    // Glue all events in between so that the from_status matches the previous to_status
    // There are two ways to fix this: 
    // - OR we update the from_status to the to_status of the previous event, 
    // - OR we update the to_status to the from_status of the next event

    // We start with setting the from_status to the to_status of the previous event (unless to_status is unknown).
    // Why? If we have two events (A -> B) followed by (A -> B). Then we want to transform it into (A -> B), (B -> B) and delete the second event (because the first created_at would be kept that way)
    await linkIncorrectEvents(knex, 'from_status');

    // Now do the reverse (in case this solves 'unknown' statuses that couldn't get resolved)
    // That means setting the to_status to the from_status of the next event.
    // E.g. (A -> unknown) followed by (B -> C) should become (A -> B) followed by (B -> C)
    await linkIncorrectEvents(knex, 'to_status');

    // STEP
    // Make sure the last event(s) of a member has a to_status of member.status
    await fixLastStatus(knex);

    // STEP
    // Make sure the first event(s) of a member starts with NULL
    await fixFirstStatus(knex);

    // STEP
    // Make sure every member has at least one event
    // We could have deleted all status events for a given member in earlier steps, so add one if that was the case
    // E.g. if the events were (paid -> free), (free -> paid) with same timestamps (not a single event with NULL)
    // @todo

    // STEP
    // If we have any remaining 'unknown' statusses, log their count
    // and change them in a 'free' status for now
    const unknownStatuses = await replaceUnknownStatuses(knex, 'free');
    if (unknownStatuses > 0) {
        logging.warn(`Couldn't fix all member status events, still had ${unknownStatuses} unknown left`);
    }

    // STEP
    // Only delete unchanged events at the end, else we risk losing time data
    await deleteUnchangedEvents(knex);
}