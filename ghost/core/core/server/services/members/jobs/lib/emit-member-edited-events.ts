const moment = require('moment');

type MemberAttributes = Record<string, string | number | boolean | Date | null>;

export interface MemberEditedEvent {
    id: string;
    previous: MemberAttributes;
    changed: MemberAttributes;
}

interface MemberModel {
    attributes: MemberAttributes;
    _previousAttributes: MemberAttributes;
    _changed: MemberAttributes;
}

export interface EmitDeps {
    models: {
        Member: {
            findOne(data: {id: string}, options: {require: boolean; context: {internal: boolean}}): Promise<MemberModel>;
        };
    };
    events: {emit(name: string, model: MemberModel, options: {context: {internal: boolean}}): void};
    logging: {warn(message: string): void; error(error: Error): void};
    sentry: {captureException(error: Error): void};
}

// Bookshelf compares *_at attributes as Dates; raw knex rows carry strings.
function normalizeDates(attributes: MemberAttributes): MemberAttributes {
    const normalized = {...attributes};

    for (const [key, value] of Object.entries(normalized)) {
        if (key.endsWith('_at') && value && !(value instanceof Date)) {
            normalized[key] = moment.utc(value).toDate();
        }
    }

    return normalized;
}

function isNotFoundError(err: unknown): boolean {
    const e = err as {errorType?: string; name?: string; message?: string} | null;
    return !!e && (
        e.errorType === 'NotFoundError' ||
        e.name === 'NotFoundError' ||
        e.message === 'NotFound' ||
        e.message === 'EmptyResponse'
    );
}

/**
 * Emit `member.edited` for members mutated with raw knex (which fires no model
 * events), mirroring what a model save would emit.
 */
export async function emitMemberEditedEvents(memberEvents: MemberEditedEvent[], {models, events, logging, sentry}: EmitDeps): Promise<void> {
    // Each emission is independent: the DB writes have already committed, so
    // one bad member must not cost the rest of the batch their webhooks.
    for (const event of memberEvents) {
        try {
            const model = await models.Member.findOne({
                id: event.id
            }, {
                require: true,
                context: {internal: true}
            });

            model._previousAttributes = normalizeDates({
                ...model.attributes,
                ...event.previous
            });
            model._changed = normalizeDates(event.changed);

            events.emit('member.edited', model, {context: {internal: true}});
        } catch (err) {
            if (isNotFoundError(err)) {
                logging.warn(`Could not emit member.edited: Member ${event.id} was not found`);
            } else {
                logging.error(err as Error);
                sentry.captureException(err as Error);
            }
        }
    }
}
