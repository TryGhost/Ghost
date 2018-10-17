import {Model, hasMany} from 'ember-cli-mirage';

export default Model.extend({
    apiKeys: hasMany(),
    webhooks: hasMany()
});
