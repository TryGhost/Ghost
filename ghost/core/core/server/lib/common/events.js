/**
 * Why has this not been moved to e.g. @tryghost/events or shared yet?
 *
 * - We currently massively overuse this utility, coupling together bits of the codebase in unexpected ways
 * - We want to prevent this, not reinforce it
 * * Having an @tryghost/events or shared/events module would reinforce this bad patter of using the same event emitter everywhere
 *
 * - Ideally, we want to refactor to:
 *    - either remove dependence on events where we can
 *    - or have separate event emitters for e.g. model layer and routing layer
 *
 */

const events = require('events');
const {EventEmitter} = events;
const {parentPort, isMainThread} = require('worker_threads');

class EventRegistry extends EventEmitter {
    /**
     * This is method is semi-hack to make sure listeners are only registered once
     * during the lifetime of the process. And example problem it solves is
     * registering duplicate listeners between Ghost instance reboots when running tests.
     * @param {string} eventName
     * @param {string} listenerName named function name registered as a listener for the event
     * @returns {boolean}
     */
    hasRegisteredListener(eventName, listenerName) {
        return !!(this.listeners(eventName).find(listener => (listener.name === listenerName)));
    }
}

const eventRegistryInstance = new EventRegistry();
eventRegistryInstance.setMaxListeners(100);

// EventEmitter internals; forwarding them across processes makes no sense
// (newListener/removeListener describe local subscription state; error has
// special "throw if unhandled" semantics that mustn't be replicated remotely).
const SKIP_FORWARD = new Set(['newListener', 'removeListener', 'error']);

// Wraps emit payloads so they survive structuredClone across worker_threads
// IPC. Two transformations:
//   1. Bookshelf model instances → plain `{__model: model.toJSON()}` envelope,
//      rehydrated on the receiving side into an adapter that exposes the same
//      .get/.toJSON/.attributes the listener expects.
//   2. Other objects (e.g. Bookshelf options) → deep-cleaned of values that
//      structuredClone rejects. Bookshelf attaches query callbacks like
//      `(data) => this.trigger('query', data)` and a Knex transaction handle
//      to the options object, neither of which clone or matter to listeners.
function isLikelyBookshelfModel(arg) {
    return arg && typeof arg === 'object'
        && typeof arg.toJSON === 'function'
        && arg.attributes && typeof arg.attributes === 'object';
}

// Recursively drops values structuredClone can't carry (functions, symbols,
// class instances with methods). Preserves primitives, Date, plain objects,
// and arrays. Depth limit guards against pathological cycles.
function toCloneable(value, depth = 0) {
    if (depth > 10 || value === null || value === undefined) {
        return value === undefined ? undefined : null;
    }
    const type = typeof value;
    if (type === 'function' || type === 'symbol') {
        return undefined;
    }
    if (type !== 'object') {
        return value;
    }
    if (value instanceof Date) {
        return value;
    }
    if (Array.isArray(value)) {
        return value
            .map(v => toCloneable(v, depth + 1))
            .filter(v => v !== undefined);
    }
    const cleaned = {};
    for (const key of Object.keys(value)) {
        const sub = toCloneable(value[key], depth + 1);
        if (sub !== undefined) {
            cleaned[key] = sub;
        }
    }
    return cleaned;
}

// Sentinel key for the Bookshelf-model envelope. Chosen to be unlikely to
// collide with anything a legitimate event payload would carry, so the
// deserializer can use its presence as a discriminator without risking
// rewriting normal data.
const BOOKSHELF_ENVELOPE_KEY = '__ghostBookshelfModelJSON';

function serializeArg(arg) {
    if (isLikelyBookshelfModel(arg)) {
        return {[BOOKSHELF_ENVELOPE_KEY]: arg.toJSON()};
    }
    return toCloneable(arg);
}

function deserializeArg(arg) {
    if (arg
        && typeof arg === 'object'
        && Object.prototype.hasOwnProperty.call(arg, BOOKSHELF_ENVELOPE_KEY)
        && arg[BOOKSHELF_ENVELOPE_KEY]
        && typeof arg[BOOKSHELF_ENVELOPE_KEY] === 'object') {
        const json = arg[BOOKSHELF_ENVELOPE_KEY];
        return {
            get(key) {
                return json[key];
            },
            toJSON() {
                return json;
            },
            attributes: json
        };
    }
    return arg;
}

if (!isMainThread && parentPort) {
    const localEmit = EventEmitter.prototype.emit.bind(eventRegistryInstance);
    const warnedForUnserializableEvent = new Set();

    eventRegistryInstance.emit = function (name, ...args) {
        // Local listeners must fire deterministically regardless of what
        // happens on the wire, so emit locally first and only then forward.
        const result = localEmit(name, ...args);

        if (typeof name === 'string' && !SKIP_FORWARD.has(name)) {
            try {
                parentPort.postMessage({
                    type: 'ghost-event-forward',
                    name,
                    args: args.map(serializeArg)
                });
            } catch (err) {
                if (!warnedForUnserializableEvent.has(name)) {
                    warnedForUnserializableEvent.add(name);
                    // Lazy require to keep this module free of logging
                    // dependencies during boot.
                    try {
                        require('@tryghost/logging').warn({
                            event: {name: 'events.forward.skipped'},
                            eventName: name,
                            err
                        }, 'Cross-process event forwarding skipped: payload not serializable');
                    } catch (logErr) {
                        // Logging unavailable; nothing useful to do
                    }
                }
            }
        }

        return result;
    };
}

/**
 * Replays an event message that was forwarded from a worker process. Called
 * by the job-service worker message handler. Returns true if the message was
 * recognised as a forwarded event (and thus consumed), false otherwise so
 * other handlers can process the message.
 *
 * @param {*} message
 * @returns {boolean}
 */
eventRegistryInstance.replayForwarded = function replayForwarded(message) {
    if (!message || typeof message !== 'object' || message.type !== 'ghost-event-forward') {
        return false;
    }
    const args = Array.isArray(message.args) ? message.args.map(deserializeArg) : [];
    // Use the prototype emit directly so any wrapper installed on this
    // instance (e.g. the worker-side forwarder) isn't re-invoked here.
    EventEmitter.prototype.emit.apply(eventRegistryInstance, [message.name, ...args]);
    return true;
};

module.exports = eventRegistryInstance;
