const ghostBookshelf = require('./base');

const FormSubmission = ghostBookshelf.Model.extend({
    tableName: 'form_submissions',

    form() {
        return this.belongsTo('Form', 'form_id');
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {
            created_at: 'DESC'
        };
    }
});

module.exports = {
    FormSubmission: ghostBookshelf.model('FormSubmission', FormSubmission)
};
