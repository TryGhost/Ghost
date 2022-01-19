import {Model, belongsTo} from 'ember-cli-mirage';

export default Model.extend({
    email: belongsTo(),
    member: belongsTo()
});
