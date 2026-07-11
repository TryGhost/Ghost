const logging = require('@tryghost/logging');

function SchedulingBase() {
    Object.defineProperty(this, 'requiredFns', {
        value: ['schedule', 'unschedule', 'run'],
        writable: false
    });
    this._reschedulers = new Set();
}

/**
 * Register a subsystem that can rebuild its scheduler queue on demand.
 *
 * Scheduler-users (post-scheduling, automations, gifts) call this at
 * construction so the adapter knows who to ask when queued URLs need
 * regenerating (e.g. after internal API key rotation). The convention is
 * that a registered rescheduler exposes a `rescheduleAll(opts)` method.
 *
 * @param {{rescheduleAll: (opts: {previousKey?: {id: string; secret: string}}) => Promise<void>}} rescheduler
 */
SchedulingBase.prototype.register = function (rescheduler) {
    this._reschedulers.add(rescheduler);
};

/**
 * Ask every registered rescheduler to rebuild its queue under the current
 * key. Best-effort: a failure in one doesn't block the others.
 *
 * @param {{previousKey?: {id: string; secret: string}}} [opts]
 * @returns {Promise<PromiseSettledResult<void>[]>}
 */
SchedulingBase.prototype.rescheduleAll = async function (opts = {}) {
    const reschedulers = Array.from(this._reschedulers);
    const results = await Promise.allSettled(
        reschedulers.map(r => r.rescheduleAll(opts))
    );
    results.forEach((result, i) => {
        if (result.status === 'rejected') {
            logging.error({
                event: {name: 'scheduler.reschedule_all.failed'},
                err: result.reason,
                rescheduler: reschedulers[i].constructor?.name ?? 'unknown'
            }, 'Rescheduler failed');
        }
    });
    return results;
};

module.exports = SchedulingBase;
