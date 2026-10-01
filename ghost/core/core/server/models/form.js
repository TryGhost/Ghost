const ghostBookshelf = require('./base');

const Form = ghostBookshelf.Model.extend({
    tableName: 'forms',

    defaults() {
        return {
            status: 'active'
        };
    },

    submissions() {
        return this.hasMany('FormSubmission', 'form_id');
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {
            created_at: 'DESC'
        };
    },

    countRelations() {
        return {
            submissions(modelOrCollection) {
                modelOrCollection.query('columns', 'forms.*', (qb) => {
                    qb.count('form_submissions.id')
                        .from('form_submissions')
                        .whereRaw('form_submissions.form_id = forms.id')
                        .as('count__submissions');
                });
            }
        };
    },

    defaultRelations: function defaultRelations(methodName, options) {
        if (['findPage', 'findAll', 'findOne'].includes(methodName)) {
            if (!options.withRelated) {
                options.withRelated = [];
            }
            if (!options.withRelated.includes('count.submissions')) {
                options.withRelated.push('count.submissions');
            }
        }
        return options;
    }
});

module.exports = {
    Form: ghostBookshelf.model('Form', Form)
};
