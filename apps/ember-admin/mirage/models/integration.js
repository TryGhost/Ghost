import {Model, hasMany} from 'miragejs';

export default Model.extend({
    apiKeys: hasMany(),
    webhooks: hasMany()
});
