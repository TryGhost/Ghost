import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {inject as service} from '@ember/service';
import {tagName} from '@ember-decorators/component';
import {task} from 'ember-concurrency';

@classic
@tagName('')
export default class GhPsmTemplateSelect extends Component {
    @service store;

    post = null;

    // internal properties
    activeTheme = null;

    // closure actions
    onTemplateSelect() {}

    // computed properties
    @computed('activeTheme.customTemplates.[]')
    get customTemplates() {
        let templates = this.get('activeTheme.customTemplates') || [];
        let defaultTemplate = {
            filename: '',
            name: 'Default'
        };

        return isEmpty(templates) ? templates : [defaultTemplate, ...templates.sortBy('name')];
    }

    @computed('post.{page,slug}', 'activeTheme.slugTemplates.[]')
    get matchedSlugTemplate() {
        let slug = this.get('post.slug');
        let type = this.post.constructor.modelName;

        let [matchedTemplate] = this.get('activeTheme.slugTemplates').filter(function (template) {
            return template.for.includes(type) && template.slug === slug;
        });

        return matchedTemplate;
    }

    @computed('post.customTemplate', 'customTemplates.[]')
    get selectedTemplate() {
        let templates = this.customTemplates;
        let filename = this.get('post.customTemplate');

        return templates.findBy('filename', filename);
    }

    // hooks
    didInsertElement() {
        super.didInsertElement(...arguments);
        this.loadActiveTheme.perform();
    }

    @action
    selectTemplate(template) {
        this.onTemplateSelect(template.filename);
    }

    // tasks
    @task(function* () {
        let store = this.store;
        let themes = yield store.peekAll('theme');

        if (isEmpty(themes)) {
            themes = yield store.findAll('theme');
        }

        let activeTheme = themes.filterBy('active', true).get('firstObject');

        this.set('activeTheme', activeTheme);
    })
        loadActiveTheme;
}
