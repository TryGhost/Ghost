function SchedulingBase() {
    Object.defineProperty(this, 'requiredFns', {
        value: ['schedule', 'unschedule', 'run'],
        writable: false
    });
}

module.exports = SchedulingBase;
