import {Model, hasMany} from 'miragejs';

export default Model.extend({
    tags: hasMany(),
    authors: hasMany('user'),
    tiers: hasMany()
});
