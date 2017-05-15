function SchedulingBase() {
    Object.defineProperty(this, 'requiredFns', {
        value: ['schedule', 'unschedule', 'reschedule', 'run'],
        writable: false
    });
}

module.exports = SchedulingBase;
