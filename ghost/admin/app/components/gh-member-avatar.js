import Component from '@glimmer/component';
import {htmlSafe} from '@ember/template';

const stringToHslColor = function (str, saturation, lightness) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    var h = hash % 360;
    return 'hsl(' + h + ', ' + saturation + '%, ' + lightness + '%)';
};

export default class GhMemberAvatarComponent extends Component {
    get memberName() {
        let {member} = this.args;

        // can be a proxy in a sparse array so .get is required
        return member.get('name') || member.get('email') || 'NM';
    }

    get backgroundStyle() {
        let color = stringToHslColor(this.memberName, 75, 55);
        return htmlSafe(`background-color: ${color}`);
    }

    get initials() {
        if (this.memberName === 'NM') {
            return 'NM';
        }

        let names = this.memberName.split(' ');
        let intials = names.length > 1 ? [names[0][0], names[names.length - 1][0]] : [names[0][0]];
        return intials.join('').toUpperCase();
    }
}
