import moment from 'moment';
import {Factory, faker} from 'ember-cli-mirage';

let randomDate = function randomDate(start = moment().subtract(30, 'days').toDate(), end = new Date()) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

let statuses = ['pending', 'subscribed'];

export default Factory.extend({
    name() { return `${faker.name.firstName()} ${faker.name.lastName()}`; },
    email: faker.internet.email,
    status() { return statuses[Math.floor(Math.random() * statuses.length)]; },
    createdAt() { return randomDate(); },
    updatedAt: null,
    createdBy: 0,
    updatedBy: null,
    unsubscribedAt: null
});
