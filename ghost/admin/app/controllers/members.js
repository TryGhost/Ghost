import Controller from '@ember/controller';
import {task} from 'ember-concurrency';

/* eslint-disable ghost/ember/alias-model-in-controller */
export default Controller.extend({
    meta: null,
    members: null,

    fetchMembers: task(function* () {
        let results = yield this.store.query('member', {
            limit: 'all'
        });

        this.set('meta', results.meta);
        this.set('members', results);
    })
});
