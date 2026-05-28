import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

// Smaller cap in the editor header — that row uses flex-wrap and a
// fixed height, so a stack wider than the available space wraps and
// overlaps page content. Post-list rows have a dedicated row of width
// per item and can comfortably hold one more.
const CAP_BY_SIZE = {md: 2, sm: 3};

export default class GhPresenceAvatars extends Component {
    @service presence;

    get _allUsers() {
        const raw = this.presence.usersForPost(this.args.postId);

        // Detect first-name collisions so we can disambiguate ("Alex S."
        // / "Alex J.") rather than rendering two identical tooltips.
        const firstNameCounts = new Map();
        const parsed = raw.map((user) => {
            const name = user.name || 'Someone';
            const parts = name.split(/\s+/).filter(Boolean);
            const firstName = parts[0] || name;
            firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
            return {user, name, parts, firstName};
        });

        return parsed.map(({user, name, parts, firstName}) => {
            let display = firstName;
            if (firstNameCounts.get(firstName) > 1 && parts.length > 1) {
                display = `${firstName} ${parts[parts.length - 1][0].toUpperCase()}.`;
            }
            const tooltip = display.length > 20 ? `${display.slice(0, 20)}…` : display;
            return {
                id: user.id,
                name,
                firstName: display,
                tooltipText: user.isIdle ? `${tooltip} (idle)` : tooltip,
                profileImage: user.profileImage || null,
                isIdle: Boolean(user.isIdle),
                initials: parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
            };
        });
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
        return this._allUsers.slice(this._cap).map(u => u.firstName).join(', ');
    }

    get sizeClass() {
        return this.args.size === 'sm' ? 'gh-presence-avatars--sm' : 'gh-presence-avatars--md';
    }
}
