import Controller from '@ember/controller';
import {A} from '@ember/array';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class MentionsController extends Controller {
    @service store;

    @tracked mentionsList = A([]);

    constructor() {
        super(...arguments);
    }
    
    @task
    *loadMentionsTask() {
        const mentions = yield this.store.query('mention', {});
        this.mentionsList = mentions;
    }
}
