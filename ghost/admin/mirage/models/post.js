import {Model, belongsTo, hasMany} from 'ember-cli-mirage';

export default Model.extend({
    tags: hasMany(),
    authors: hasMany('user'),
    email: belongsTo()
});
