import {Factory} from 'miragejs';

export default Factory.extend({
    createdAt: '2013-11-25T14:48:11.000Z',
    description(i) { return `Role ${i}`; },
    name: '',
    updatedAt: '2013-11-25T14:48:11.000Z'
});
