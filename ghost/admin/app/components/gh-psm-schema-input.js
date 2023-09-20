import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {inject as service} from '@ember/service';

const SCHEMAS = [
    {label: 'Article', name: 'article'},
    {label: 'News Article', name: 'newsArticle'}
];

@classic
export default class GhPsmSchemaInput extends Component {
    @service settings;

    // public attrs
    post = null;

    @computed('post.schema')
    get selectedSchema() {
        return this.get('post.schema') || 'article';
    }

    init() {
        super.init(...arguments);
        this.availableSchemas = [...SCHEMAS];
    }

    @action
    updateSchema(newSchema) {
        this.post.set('schema', newSchema);
    }
}
