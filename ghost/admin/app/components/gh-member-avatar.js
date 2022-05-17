import Component from '@glimmer/component';
import {get} from '@ember/object';
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

        // can be given a proxy object from a sparse array so get is required
        return get(member, 'name') || get(member, 'email') || 'NM';
    }

    get avatarImage() {
        let {member} = this.args;

        // to cover both ways avatar image is returned depending on where member data comes from
        return get(member, 'avatar_image') || get(member, 'avatarImage') || null;
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
