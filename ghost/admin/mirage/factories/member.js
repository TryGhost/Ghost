import moment from 'moment-timezone';
import {Factory, trait} from 'miragejs';
import {faker} from '@faker-js/faker';

let randomDate = function randomDate(start = moment().subtract(30, 'days').toDate(), end = new Date()) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

export default Factory.extend({
    name() { return `${faker.name.firstName()} ${faker.name.lastName()}`; },
    email: faker.internet.email,
    status: 'free',
    createdAt() { return moment.utc(randomDate()).format('YYYY-MM-DD HH:mm:ss'); },

    free: trait({
        status: 'free'
    }),

    paid: trait({
        status: 'paid'
    }),

    comped: trait({
        status: 'comped'
    }),

    afterCreate(member, server) {
        const newslettersToSignup = server.schema.newsletters.where({subscribeOnSignup: true});

        member.newsletters = newslettersToSignup;
        member.save();
    }
});
