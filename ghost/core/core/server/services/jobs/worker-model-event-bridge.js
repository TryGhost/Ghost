const {z} = require('zod');
const moment = require('moment');

const MODEL_EVENT_TYPE = 'model-event';
const SUPPORTED_MODEL_EVENTS = {
    'member.edited': {
        model: 'Member'
    }
};

const attributesSchema = z.record(z.string(), z.unknown());

const messageSchema = z.object({
    type: z.literal(MODEL_EVENT_TYPE),
    eventName: z.enum(Object.keys(SUPPORTED_MODEL_EVENTS)),
    model: z.string(),
    id: z.string().min(1),
    previous: attributesSchema,
    changed: attributesSchema.refine(value => Object.keys(value).length > 0, {
        message: 'must include at least one changed attribute'
    }),
    options: attributesSchema.optional()
}).refine(message => SUPPORTED_MODEL_EVENTS[message.eventName]?.model === message.model, {
    message: 'does not match the event',
    path: ['model']
});

class WorkerModelEventBridge {
    constructor({models, events, logging, sentry}) {
        this.models = models;
        this.events = events;
        this.logging = logging;
        this.sentry = sentry;
    }

    isModelEventMessage(message) {
        return isObject(message) && message.type === MODEL_EVENT_TYPE;
    }

    async handle(message, meta = {}) {
        const validationError = this.validate(message);

        if (validationError) {
            this.logging.warn(`Ignoring invalid worker model event from job ${meta.jobName || 'unknown'}: ${validationError}`);
            return false;
        }

        try {
            return await this.emitModelEvent(message);
        } catch (err) {
            this.logging.error(err);
            this.sentry.captureException(err);
            return false;
        }
    }

    validate(message) {
        const result = messageSchema.safeParse(message);

        if (result.success) {
            return null;
        }

        return result.error.issues
            .map(issue => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
            .join('; ');
    }

    async emitModelEvent(message) {
        const Model = this.models[message.model];
        let model;

        try {
            model = await Model.findOne({
                id: message.id
            }, {
                require: true,
                context: {internal: true}
            });
        } catch (err) {
            if (isNotFoundError(err)) {
                this.logging.warn(`Could not emit worker model event ${message.eventName}: ${message.model} ${message.id} was not found`);
                return false;
            }

            throw err;
        }

        model._previousAttributes = normalizeDates({
            ...model.attributes,
            ...message.previous
        });
        model._changed = normalizeDates(message.changed);

        const options = normalizeOptions(message.options);
        this.events.emit(message.eventName, model, options);
        return true;
    }
}

function normalizeOptions(options = {}) {
    return {
        ...options,
        context: {
            ...options.context,
            internal: true
        }
    };
}

function normalizeDates(attributes) {
    const normalized = {...attributes};

    for (const [key, value] of Object.entries(normalized)) {
        if (key.endsWith('_at') && value && !(value instanceof Date)) {
            normalized[key] = moment.utc(value).toDate();
        }
    }

    return normalized;
}

function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNotFoundError(err) {
    return err && (
        err.errorType === 'NotFoundError' ||
        err.name === 'NotFoundError' ||
        err.message === 'NotFound' ||
        err.message === 'EmptyResponse'
    );
}

module.exports = WorkerModelEventBridge;
module.exports.MODEL_EVENT_TYPE = MODEL_EVENT_TYPE;
