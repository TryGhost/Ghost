import {Model, hasMany} from 'ember-cli-mirage';

export default Model.extend({
    labels: hasMany(),
    emailRecipients: hasMany(),
    products: hasMany()
});
