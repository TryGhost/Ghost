import Component from '@ember/component';
import {computed} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Component.extend({

    store: service(),

    // public attributes
    tagName: '',
    post: null,

    // internal properties
    activeTheme: null,

    // closure actions
    onTemplateSelect() {},

    // computed properties
    customTemplates: computed('activeTheme.customTemplates.[]', function () {
        let templates = this.get('activeTheme.customTemplates') || [];
        let defaultTemplate = {
            filename: '',
            name: 'Default'
        };

        return isEmpty(templates) ? templates : [defaultTemplate, ...templates.sortBy('name')];
    }),

    matchedSlugTemplate: computed('post.{page,slug}', 'activeTheme.slugTemplates.[]', function () {
        let slug = this.get('post.slug');
        let type = this.get('post.page') ? 'page' : 'post';

        let [matchedTemplate] = this.get('activeTheme.slugTemplates').filter(function (template) {
            return template.for.includes(type) && template.slug === slug;
        });

        return matchedTemplate;
    }),

    selectedTemplate: computed('post.customTemplate', 'customTemplates.[]', function () {
        let templates = this.get('customTemplates');
        let filename = this.get('post.customTemplate');

        return templates.findBy('filename', filename);
    }),

    // hooks
    didInsertElement() {
        this._super(...arguments);
        this.get('loadActiveTheme').perform();
    },

    actions: {
        selectTemplate(template) {
            this.onTemplateSelect(template.filename);
        }
    },

    // tasks
    loadActiveTheme: task(function* () {
        let store = this.get('store');
        let themes = yield store.peekAll('theme');

        if (isEmpty(themes)) {
            themes = yield store.findAll('theme');
        }

        let activeTheme = themes.filterBy('active', true).get('firstObject');

        this.set('activeTheme', activeTheme);
    })
});
