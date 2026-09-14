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
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {
            created_at: 'DESC'
        };
    }
});

module.exports = {
    Form: ghostBookshelf.model('Form', Form)
};
