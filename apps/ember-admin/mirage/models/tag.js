import {Model, hasMany} from 'miragejs';

export default Model.extend({
    posts: hasMany()
});
