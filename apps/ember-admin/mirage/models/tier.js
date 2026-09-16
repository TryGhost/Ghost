import {Model, hasMany} from 'miragejs';

export default Model.extend({
    members: hasMany()
});
