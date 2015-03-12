import Ember from 'ember';
// mixin used for routes that need to set a css className on the body tag

var styleBody = Ember.Mixin.create({
    activate: function () {
        this._super();

        var cssClasses = this.get('classNames');

        if (cssClasses) {
            Ember.run.schedule('afterRender', null, function () {
                cssClasses.forEach(function (curClass) {
                    Ember.$('body').addClass(curClass);
                });
            });
        }
    },

    deactivate: function () {
        this._super();

        var cssClasses = this.get('classNames');

        Ember.run.schedule('afterRender', null, function () {
            cssClasses.forEach(function (curClass) {
                Ember.$('body').removeClass(curClass);
            });
        });
    }
});

export default styleBody;
