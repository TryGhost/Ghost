import {Model, belongsTo, hasMany} from 'miragejs';

export default Model.extend({
    tags: hasMany(),
    authors: hasMany('user'),
    email: belongsTo(),
    newsletter: belongsTo()
});
