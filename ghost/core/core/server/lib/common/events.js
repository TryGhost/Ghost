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

const createEventRegistry = require('./create-event-registry');

module.exports = createEventRegistry();
