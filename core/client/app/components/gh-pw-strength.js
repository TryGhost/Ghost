/* global zxcvbn */
import Ember from 'ember';

var activeClass = 'pw-strength-activedot';

export default Ember.Component.extend({
    password: null,
    classNames: 'pw-strength',

    dots: Ember.computed('password', function () {
        if (typeof zxcvbn !== 'function') {
            return Ember.A();
        }

        var dotArray = ['', '', '', '', ''],
            password = this.get('password'),
            score    = zxcvbn(password).score,
            i;

        for (i = 0; i <= score; i++) {
            dotArray[i] = activeClass;
        }

        return Ember.A(dotArray.reverse());
    })
});
