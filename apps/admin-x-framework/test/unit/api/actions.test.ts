import {type Action, actionsAreGroupable, getActionTitle} from '../../../src/api/actions';

const baseAction = (overrides: Partial<Action> = {}): Action => ({
    id: 'action-1',
    resource_id: 'resource-1',
    resource_type: 'post',
    actor_id: 'actor-1',
    actor_type: 'user',
    event: 'edited',
    context: {},
    created_at: '2026-07-01T00:00:00.000Z',
    ...overrides
});

describe('actions api helpers', () => {
    describe('actionsAreGroupable', () => {
        it('groups repeated actions for the same resource type, resource id, event, and action name', () => {
            const action = baseAction({context: {action_name: 'updated'}});
            const nextAction = baseAction({id: 'action-2', context: {action_name: 'updated'}});

            expect(actionsAreGroupable(action, nextAction)).toBe(true);
        });

        it('does not group null-resource actions for different resource types', () => {
            const action = baseAction({resource_id: null, resource_type: 'security_action', context: {action_name: 'reset_authentication'}});
            const nextAction = baseAction({id: 'action-2', resource_id: null, resource_type: 'setting', context: {action_name: 'updated'}});

            expect(actionsAreGroupable(action, nextAction)).toBe(false);
        });

        it('does not group edited actions with different action names', () => {
            const action = baseAction({resource_id: null, resource_type: 'security_action', context: {action_name: 'reset_authentication'}});
            const nextAction = baseAction({id: 'action-2', resource_id: null, resource_type: 'security_action', context: {action_name: 'rotate_keys'}});

            expect(actionsAreGroupable(action, nextAction)).toBe(false);
        });
    });

    describe('getActionTitle', () => {
        it('formats reset authentication security actions', () => {
            expect(getActionTitle(baseAction({
                resource_id: null,
                resource_type: 'security_action',
                context: {action_name: 'reset_authentication'}
            }))).toBe('Security action reset authentication');
        });

        it('formats custom field definition actions across the lifecycle', () => {
            const title = (event: string) => getActionTitle(baseAction({resource_type: 'member_custom_field', event}));
            expect(title('added')).toBe('Custom field added');
            expect(title('edited')).toBe('Custom field edited');
            expect(title('archived')).toBe('Custom field archived');
            expect(title('restored')).toBe('Custom field restored');
            expect(title('deleted')).toBe('Custom field deleted');
        });

        it('formats a member custom field value change', () => {
            expect(getActionTitle(baseAction({
                resource_type: 'member',
                context: {action_name: 'custom_fields_edited', primary_name: 'Jamie Larson'}
            }))).toBe('Member custom fields edited');
        });

        it('formats a member edit that did not touch custom fields', () => {
            expect(getActionTitle(baseAction({
                resource_type: 'member',
                context: {primary_name: 'Jamie Larson'}
            }))).toBe('Member edited');
        });
    });
});
