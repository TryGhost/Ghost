import Component from '@ember/component';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';

const stringToHslColor = function (str, saturation, lightness) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    var h = hash % 360;
    return 'hsl(' + h + ', ' + saturation + '%, ' + lightness + '%)';
};

export default Component.extend({
    tagName: '',

    member: null,
    initialsClass: computed('sizeClass', function () {
        return this.sizeClass || 'f5 fw4 lh-zero';
    }),

    backgroundStyle: computed('member.{name,email}', function () {
        let name = this.member.name || this.member.email;
        if (name) {
            let color = stringToHslColor(name, 55, 55);
            return htmlSafe(`background-color: ${color}`);
        }

        return htmlSafe('');
    }),

    initials: computed('member.{name,email}', function () {
        let name = this.member.name || this.member.email;
        if (name) {
            let names = name.split(' ');
            let intials = names.length > 1 ? [names[0][0], names[names.length - 1][0]] : [names[0][0]];
            return intials.join('').toUpperCase();
        }
        return '';
    })
});
