import {Model, hasMany} from 'miragejs';

export default Model.extend({
    labels: hasMany(),
    tiers: hasMany(),
    newsletters: hasMany(),
    subscriptions: hasMany()
});
