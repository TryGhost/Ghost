import Mirage, {faker} from 'ember-cli-mirage';

// jscs:disable requireBlocksOnNewline
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
export default Mirage.Factory.extend({
    email() { return faker.internet.email(); },
    created_at() { return new Date(); },
    updated_at: null,
    created_by: 0,
    updated_by: null,
    unsubscribed_at: null
});
