const debug = require('@tryghost/debug')('services:url:queue');
const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

/**
 * ### Purpose of this queue
 *
 * Ghost fetches as earliest as possible the resources from the database. The reason is simply: we
 * want to know all urls as soon as possible.
 *
 * Parallel to this, the routes are read/prepared and registered in express.
 * So the challenge is to handle both resource availability and route registration.
 * If you start an event, all subscribers of it are executed in a sequence. The queue will wait
 * till the current subscriber has finished it's work.
 * The url service must ensure that each url in the system exists once. The order of
 * subscribers defines who will possibly own an url first.
 *
 * If an event has finished, the subscribers of this event still remain in the queue.
 * That means:
 *
 * - you can re-run an event
 * - you can add more subscribers to an existing queue
 * - you can order subscribers (helpful if you want to order routers)
 *
 * Each subscriber represents one instance of the url generator. One url generator represents one router.
 *
 * ### Tolerance option
 *
 * You can define a tolerance value per event. If you want to wait an amount of time till you think
 * all subscribers have registered.
 *
 * ### Some examples to understand cases
 *
 * e.g.
 *  - resources have been loaded, event has started
 *  - no subscribers yet, we need to wait, express still initialises
 *  - okay, routes are coming in
 *  - we notify the subscribers
 *
 * e.g.
 *  - resources are in the progress of fetching from the database
 *  - routes are already waiting for the resources
 *
 * e.g.
 *  - resources are in the progress of fetching from the database
 *  - 2 subscribers are already registered
 *  - resources finished, event starts
 *  - 2 more subscribers are coming in

 * ### Events
 *   - unique events e.g. added, updated, init, all
 *   - has subscribers
 *   - we remember the subscriber
 *
 * ### Actions
 *   - one event can have multiple actions
 *   - unique actions e.g. add post 1, add post 2
 *   - one event might only allow a single action to avoid collisions e.g. you initialise data twice
 *   - if an event has no action, the name of the action is the name of the event
 *   - in this case the event can only run once at a time
 *   - makes use of `toNotify` to remember who was notified already
 */
class Queue extends EventEmitter {
    constructor() {
        super();
        this.queue = {};
        this.toNotify = {};
    }

    /**
     * @description Register a subscriber for this queue.
     *
     * tolerance:
     *   - 0: don't wait for more subscribers [default]
     *   - 100: wait long enough till all subscribers have registered (e.g. bootstrap)
     *
     * @param {Object} options
     * @param {function} fn
     */
    register(options, fn) {
        if (!Object.prototype.hasOwnProperty.call(options, 'tolerance')) {
            options.tolerance = 0;
        }

        // CASE: nobody has initialised the queue event yet
        if (!Object.prototype.hasOwnProperty.call(this.queue, options.event)) {
            this.queue[options.event] = {
                tolerance: options.tolerance,
                requiredSubscriberCount: options.requiredSubscriberCount || 0,
                subscribers: []
            };
        }

        debug('register', options.event, options.tolerance);

        this.queue[options.event].subscribers.push(fn);
    }

    /**
     * @description The queue runs & executes subscribers one by one (sequentially)
     * @param {Object} options
     */
    run(options) {
        const {event, action, eventData} = options;

        clearTimeout(this.toNotify[action].timeout);
        this.toNotify[action].timeout = null;

        const subscribers = this.queue[event].subscribers;
        const notified = this.toNotify[action].notified;

        debug('run', action, event, subscribers.length, notified.length);

        if (subscribers.length && subscribers.length !== notified.length) {
            const fn = subscribers[notified.length];

            debug('run.execute', action, event, notified.length);

            /**
             * @NOTE: Currently no async operations happen in the subscribers functions.
             * We can trigger the functions sync.
             */
            try {
                fn(eventData);

                debug('run.executed', action, event, notified.length);
                this.toNotify[action].notified.push(fn);
                this.run(options);
            } catch (err) {
                debug('error', err.message);

                logging.error(new errors.InternalServerError({
                    message: 'Something bad happened.',
                    code: 'SERVICES_URL_QUEUE',
                    err: err
                }));

                // @NOTE: The url service stays in maintenance mode. There is nothing we can do if an url generator fails.
            }
        } else {
            // CASE 1: zero tolerance, kill run fn
            // CASE 2: okay, i was tolerant enough, kill me
            // CASE 3: wait for more subscribers, i am still tolerant
            if (this.queue[event].tolerance === 0) {
                delete this.toNotify[action];
                debug('run.ended (1)', event, action);
                this.emit('ended', event);
            } else if (subscribers.length >= this.queue[event].requiredSubscriberCount &&
                this.toNotify[action].timeoutInMS > this.queue[event].tolerance) {
                delete this.toNotify[action];
                debug('run.ended (2)', event, action);
                this.emit('ended', event);
            } else {
                debug('run.retry', event, action, this.toNotify[action].timeoutInMS);

                this.toNotify[action].timeoutInMS = this.toNotify[action].timeoutInMS * 1.1;

                this.toNotify[action].timeout = setTimeout(() => {
                    this.run(options);
                }, this.toNotify[action].timeoutInMS);
            }
        }
    }

    /**
     * @description Start the queue from outside.
     *
     * CASE:
     *
     *   - resources were fetched from database on bootstrap
     *   - resource was added
     *
     * @param options
     */
    start(options) {
        debug('start');

        // CASE: nobody is in the event queue waiting yet
        // e.g. all resources are fetched already, but no subscribers (bootstrap)
        // happens only for high tolerant events
        if (!Object.prototype.hasOwnProperty.call(this.queue, options.event)) {
            this.queue[options.event] = {
                tolerance: options.tolerance || 0,
                requiredSubscriberCount: options.requiredSubscriberCount || 0,
                subscribers: []
            };
        }

        // an event doesn't need an action
        if (!options.action) {
            options.action = options.event;
        }

        // CASE 1: the queue supports killing an event e.g. resource edit is triggered twice very fast
        // CASE 2: is the action already running, stop it, because e.g. configuration has changed
        if (this.toNotify[options.action]) {
            // CASE: timeout was registered, kill it, this will stop the run function of this action
            if (this.toNotify[options.action].timeout) {
                clearTimeout(this.toNotify[options.action].timeout);
                this.toNotify[options.action].timeout = null;
            } else {
                debug('ignore. is already running', options.event, options.action);
                return;
            }
        }

        // @NOTE: reset who was already notified
        this.toNotify[options.action] = {
            event: options.event,
            timeoutInMS: options.timeoutInMS || 50,
            notified: []
        };

        this.emit('started', options.event);
        this.run(options);
    }

    /**
     * @description Hard reset queue from outside.
     *
     * Reset usually only happens if you e.g. switch the api version.
     */
    reset() {
        this.queue = {};

        _.each(this.toNotify, (obj) => {
            clearTimeout(obj.timeout);
        });

        this.toNotify = {};
    }

    /**
     * @description Soft reset queue from outside.
     *
     * A soft reset does NOT clear the subscribers!
     * Only used for test env currently.
     */
    softReset() {
        _.each(this.toNotify, (obj) => {
            clearTimeout(obj.timeout);
        });

        this.toNotify = {};
    }
}

module.exports = Queue;
