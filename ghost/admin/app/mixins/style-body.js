import $ from 'jquery';
import Mixin from 'ember-metal/mixin';
import run from 'ember-runloop';

// mixin used for routes that need to set a css className on the body tag
export default Mixin.create({
    activate() {
        let cssClasses = this.get('classNames');

        this._super(...arguments);

        if (cssClasses) {
            run.schedule('afterRender', null, function () {
                cssClasses.forEach((curClass) => {
                    $('body').addClass(curClass);
                });
            });
        }
    },

    deactivate() {
        let cssClasses = this.get('classNames');

        this._super(...arguments);

        run.schedule('afterRender', null, function () {
            cssClasses.forEach((curClass) => {
                $('body').removeClass(curClass);
            });
        });
    }
});
