import faker from 'faker';
import moment from 'moment';
import {Factory} from 'ember-cli-mirage';

let randomDate = function randomDate(start = moment().subtract(30, 'days').toDate(), end = new Date()) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

export default Factory.extend({
    name() { return `${faker.name.firstName()} ${faker.name.lastName()}`; },
    email: faker.internet.email,
    createdAt() { return randomDate(); }
});
