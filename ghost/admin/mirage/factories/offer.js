import faker from 'faker';
import moment from 'moment';
import {Factory} from 'miragejs';

let randomDate = function randomDate(start = moment().subtract(30, 'days').toDate(), end = new Date()) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

export default Factory.extend({
    name() { return `${faker.name.firstName()} ${faker.name.lastName()}`; },
    amount() { return faker.datatype.number({min: 1, max: 10}); },
    displayTitle() { return faker.lorem.word(); },
    code() { return faker.lorem.slug(); },
    createdAt() { return randomDate(); },
    tier() {
        return {
            id: '1'
        };
    }
});
