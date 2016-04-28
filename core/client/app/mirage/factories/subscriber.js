import Mirage, {faker} from 'ember-cli-mirage';

let randomDate = function randomDate(start = moment().subtract(30, 'days').toDate(), end = new Date()) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

let statuses = ['pending', 'subscribed'];

// jscs:disable requireBlocksOnNewline
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
export default Mirage.Factory.extend({
    uuid(i) { return `subscriber-${i}`; },
    name() { return `${faker.name.firstName()} ${faker.name.lastName()}`; },
    email() { return faker.internet.email(); },
    status() { return statuses[Math.floor(Math.random() * statuses.length)]; },
    created_at() { return randomDate(); },
    updated_at: null,
    created_by: 0,
    updated_by: null,
    unsubscribed_at: null
});
