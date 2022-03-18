import {Model, hasMany} from 'miragejs';

export default Model.extend({
    labels: hasMany(),
    emailRecipients: hasMany(),
    products: hasMany(),
    subscriptions: hasMany()
});
