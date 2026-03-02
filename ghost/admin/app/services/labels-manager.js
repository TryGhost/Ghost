import Service, {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

const PAGE_SIZE = 100;

export default class LabelsManagerService extends Service {
    @service store;

    sortLabels(labels = []) {
        return labels
            .filter(label => label.get('id') !== null)
            .sort((labelA, labelB) => (labelA.name || '').localeCompare((labelB.name || ''), undefined, {ignorePunctuation: true}));
    }

    @task({restartable: true})
    *searchLabelsTask(term, {page = 1} = {}) {
        yield timeout(250);
        const safeTerm = term.replace(/'/g, `\\'`);
        return yield this.store.query('label', {filter: `name:~'${safeTerm}'`, limit: PAGE_SIZE, page, order: 'name asc'});
    }
}
