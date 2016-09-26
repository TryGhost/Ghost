import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import {hasMany} from 'ember-data/relationships';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';

export default Model.extend({
    token: attr('string'),
    email: attr('string'),
    expires: attr('number'),
    createdAtUTC: attr('moment-utc'),
    createdBy: attr('number'),
    updatedAtUTC: attr('moment-utc'),
    updatedBy: attr('number'),
    status: attr('string'),
    roles: hasMany('role', {
        embedded: 'always',
        async: false
    }),

    ajax: injectService(),
    ghostPaths: injectService(),

    role: computed('roles', {
        get() {
            return this.get('roles.firstObject');
        },
        set(key, value) {
            // Only one role per user, so remove any old data.
            this.get('roles').clear();
            this.get('roles').pushObject(value);

            return value;
        }
    }),

    resend() {
        let fullInviteData = this.toJSON();
        let inviteData = {
            email: fullInviteData.email,
            roles: fullInviteData.roles
        };
        let inviteUrl = this.get('ghostPaths.url').api('invites');

        return this.get('ajax').post(inviteUrl, {
            data: JSON.stringify({invites: [inviteData]}),
            contentType: 'application/json'
        });
    }
});
