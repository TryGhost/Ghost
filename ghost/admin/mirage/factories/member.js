import faker from 'faker';
import moment from 'moment';
import {Factory, trait} from 'ember-cli-mirage';

let randomDate = function randomDate(start = moment().subtract(30, 'days').toDate(), end = new Date()) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

export default Factory.extend({
    name() { return `${faker.name.firstName()} ${faker.name.lastName()}`; },
    email: faker.internet.email,
    status: 'free',
    subscribed: true,
    createdAt() { return randomDate(); },

    free: trait({
        status: 'free'
    }),

    paid: trait({
        status: 'paid'
    }),

    comped: trait({
        status: 'comped'
    })
});
