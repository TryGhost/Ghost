import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {
    PENDING_ACTIVITY_PREFIX,
    formatPendingActivityContent,
    generatePendingActivity,
    generatePendingActivityId,
    isPendingActivity
} from '../../../src/utils/pending-activity';

describe('Pending Activity Utils', function () {
    describe('generatePendingActivityId', function () {
        it('should generate a pending activity id', function () {
            expect(generatePendingActivityId()).toMatch(new RegExp(`^${PENDING_ACTIVITY_PREFIX}[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`));
        });
    });

    describe('isPendingActivity', function () {
        it('should return true if the activity is pending', function () {
            expect(isPendingActivity('7c81cd06-b4bb-4b30-a745-8332df794398')).toBe(false);
            expect(isPendingActivity(`${PENDING_ACTIVITY_PREFIX}7c81cd06-b4bb-4b30-a745-8332df794398`)).toBe(true);
        });
    });

    describe('generatePendingActivity', function () {
        it('should generate a pending activity', function () {
            const actor: ActorProperties = {
                id: 'https://example.com/actor',
                icon: {
                    url: 'https://example.com/icon.png'
                },
                name: 'Example Actor',
                preferredUsername: 'example',
                '@context': '',
                discoverable: false,
                featured: '',
                followers: '',
                following: '',
                image: {url: ''},
                inbox: '',
                manuallyApprovesFollowers: false,
                outbox: '',
                publicKey: {
                    id: '',
                    owner: '',
                    publicKeyPem: ''
                },
                published: '',
                summary: '',
                type: 'Person',
                url: 'https://example.com/actor'
            };
            const id = generatePendingActivityId();
            const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
            const pendingActivity = generatePendingActivity(actor, id, content);

            expect(pendingActivity.actor.id).toEqual(actor.url);
            expect(pendingActivity.actor.icon.url).toEqual(actor.icon.url);
            expect(pendingActivity.actor.name).toEqual(actor.name);
            expect(pendingActivity.actor.preferredUsername).toEqual(actor.preferredUsername);
            expect(pendingActivity.id).toBe(id);
            expect(pendingActivity.type).toBe('Create');
            expect(pendingActivity.object.type).toBe('Note');
            expect(pendingActivity.object.content).toBe(content);
            expect(pendingActivity.object.preview).toBeDefined();
            expect(pendingActivity.object.preview!.type).toBe('Note');
            expect(pendingActivity.object.preview!.content).toBe(content);
            expect(pendingActivity.object.id).toBe(id);
            expect(pendingActivity.object.attributedTo).toBeDefined();
            expect(pendingActivity.object.attributedTo).toBeInstanceOf(Object);

            const {
                id: attributedToId,
                icon: attributedToIcon,
                name: attributedToName,
                preferredUsername: attributedToPreferredUsername
            } = pendingActivity.object.attributedTo as ActorProperties;

            expect(attributedToId).toEqual(actor.url);
            expect(attributedToIcon.url).toEqual(actor.icon.url);
            expect(attributedToName).toEqual(actor.name);
            expect(attributedToPreferredUsername).toEqual(actor.preferredUsername);
        });
    });

    describe('formatPendingActivityContent', function () {
        it('should format the content', function () {
            const content = 'Lorem ipsum dolor sit amet\nconsectetur adipiscing elit.';

            expect(
                formatPendingActivityContent(content)
            ).toBe('Lorem ipsum dolor sit amet<br />consectetur adipiscing elit.');
        });
    });
});
