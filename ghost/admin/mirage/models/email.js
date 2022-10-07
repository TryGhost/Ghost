import {Model, belongsTo} from 'miragejs';

export default Model.extend({
    post: belongsTo()
});
