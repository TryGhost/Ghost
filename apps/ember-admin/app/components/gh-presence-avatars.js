import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

const CAP_BY_SIZE = {md: 2, sm: 3};
const TOOLTIP_MAX = 20;

function firstNameParts(name) {
    const parts = (name || 'Someone').split(/\s+/).filter(Boolean);
    return {parts, firstName: parts[0] || name || 'Someone'};
}

function displayName(firstName, parts, firstNameCounts) {
    const hasCollision = firstNameCounts.get(firstName) > 1;
    const hasLastName = parts.length > 1;
    if (hasCollision && hasLastName) {
        return `${firstName} ${parts[parts.length - 1][0].toUpperCase()}.`;
    }
    return firstName;
}

function truncateTooltip(display) {
    return display.length > TOOLTIP_MAX ? `${display.slice(0, TOOLTIP_MAX)}…` : display;
}

function toAvatarView(user, parts, firstName, firstNameCounts) {
    const display = displayName(firstName, parts, firstNameCounts);
    const tooltip = truncateTooltip(display);
    return {
        id: user.id,
        firstName: display,
        tooltipText: user.isIdle ? `${tooltip} (idle)` : tooltip,
        profileImage: user.profileImage || null,
        isIdle: Boolean(user.isIdle),
        initials: parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
    };
}

export default class GhPresenceAvatars extends Component {
    @service presence;

    get _allUsers() {
        const firstNameCounts = new Map();
        const parsed = this.presence.usersForPost(this.args.postId).map((user) => {
            const {parts, firstName} = firstNameParts(user.name);
            firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
            return {user, parts, firstName};
        });
        return parsed.map(({user, parts, firstName}) => toAvatarView(user, parts, firstName, firstNameCounts));
    }

    get _cap() {
        return CAP_BY_SIZE[this.args.size === 'sm' ? 'sm' : 'md'];
    }

    get users() {
        return this._allUsers.slice(0, this._cap);
    }

    get overflowCount() {
        return Math.max(0, this._allUsers.length - this._cap);
    }

    get overflowTooltip() {
        const hiddenUsers = this._allUsers.slice(this._cap);
        const visibleNames = hiddenUsers.slice(0, 5).map(user => user.firstName);
        const remaining = hiddenUsers.length - visibleNames.length;
        return remaining > 0 ? `${visibleNames.join(', ')} and ${remaining} more` : visibleNames.join(', ');
    }

    get overflowAriaLabel() {
        return `${this.overflowCount} more editors: ${this.overflowTooltip}`;
    }

    get sizeClass() {
        return this.args.size === 'sm' ? 'gh-presence-avatars--sm' : 'gh-presence-avatars--md';
    }
}
