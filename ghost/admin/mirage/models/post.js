import {Model, hasMany} from 'ember-cli-mirage';

export default Model.extend({
    tags: hasMany(),
    authors: hasMany('user')
});
