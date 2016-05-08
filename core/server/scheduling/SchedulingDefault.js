var util = require('util'),
    SchedulingBase = require(__dirname + '/SchedulingBase');

/**
 * @TODO: implement me
 */
function SchedulingDefault(options) {
    SchedulingBase.call(this, options);
}

util.inherits(SchedulingDefault, SchedulingBase);

SchedulingDefault.prototype.run = function () {};
SchedulingDefault.prototype.schedule = function () {};
SchedulingDefault.prototype.reschedule = function () {};
SchedulingDefault.prototype.unschedule = function () {};

module.exports = SchedulingDefault;
