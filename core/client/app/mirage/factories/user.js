/* jscs:disable */
import Mirage from 'ember-cli-mirage';

export default Mirage.Factory.extend({
    accessibility() { return null; },
    bio() { return null; },
    cover() { return null; },
    created_at() { return '2015-09-02T13:41:50.000Z'; },
    created_by() { return null; },
    email(i) { return `user-${i}@example.com`; },
    image() { return '//www.gravatar.com/avatar/3ae045bc198a157401827c8455cd7c99?s=250&d=mm&r=x'; },
    language() { return 'en_US'; },
    last_login() { return '2015-11-02T16:12:05.000Z'; },
    location() { return null; },
    meta_description() { return null; },
    meta_title() { return null; },
    name(i) { return `User ${i}`; },
    slug(i) { return `user-${i}`; },
    status() { return 'active'; },
    tour() { return null; },
    updated_at() { return '2015-11-02T16:12:05.000Z'; },
    updated_by() { return '2015-09-02T13:41:50.000Z'; },
    uuid(i) { return `user-${i}`; },
    website() { return 'http://example.com'; },

    roles() { return []; }
});
