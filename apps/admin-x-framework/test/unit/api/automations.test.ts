import ObjectId from 'bson-objectid';
import {
    AutomationDetail,
    insertSendEmailAction,
    insertWaitAction
} from '../../../src/api/automations';

const baseDetail = (actions: AutomationDetail['actions'], edges: AutomationDetail['edges']): AutomationDetail => ({
    id: 'a1',
    slug: 'welcome',
    name: 'Welcome',
    status: 'active',
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    actions,
    edges
});

describe('automations api helpers', () => {
    describe('insertWaitAction', () => {
        it('appends to an empty chain (no previous, no next)', () => {
            const detail = baseDetail([], []);

            const next = insertWaitAction({detail, anchor: {}});

            expect(next.actions).toHaveLength(1);
            expect(next.actions[0]).toMatchObject({type: 'wait', data: {wait_hours: 24}});
            expect(next.edges).toEqual([]);
        });

        it('appends at the tail of a non-empty chain by wiring the previous tail to the new action', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            const next = insertWaitAction({detail, anchor: {previousActionId: 'a'}});

            expect(next.actions).toHaveLength(2);
            const newAction = next.actions[1];
            expect(next.edges).toEqual([{source_action_id: 'a', target_action_id: newAction.id}]);
        });

        it('inserts at the head by leaving the new action as the new head', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            const next = insertWaitAction({detail, anchor: {nextActionId: 'a'}});

            expect(next.actions).toHaveLength(2);
            const newAction = next.actions[1];
            expect(next.edges).toEqual([{source_action_id: newAction.id, target_action_id: 'a'}]);
        });

        it('inserts between two existing actions by replacing one edge with two', () => {
            const detail = baseDetail(
                [
                    {id: 'a', type: 'wait', data: {wait_hours: 24}},
                    {id: 'b', type: 'wait', data: {wait_hours: 48}}
                ],
                [{source_action_id: 'a', target_action_id: 'b'}]
            );

            const next = insertWaitAction({detail, anchor: {previousActionId: 'a', nextActionId: 'b'}});

            expect(next.actions).toHaveLength(3);
            const newAction = next.actions[2];
            expect(next.edges).toContainEqual({source_action_id: 'a', target_action_id: newAction.id});
            expect(next.edges).toContainEqual({source_action_id: newAction.id, target_action_id: 'b'});
            expect(next.edges).not.toContainEqual({source_action_id: 'a', target_action_id: 'b'});
            expect(next.edges).toHaveLength(2);
        });

        it('does not mutate the input detail', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            insertWaitAction({detail, anchor: {previousActionId: 'a'}});

            expect(detail.actions).toHaveLength(1);
            expect(detail.edges).toEqual([]);
        });

        it('uses ObjectId-compatible action ids', () => {
            const next = insertWaitAction({detail: baseDetail([], []), anchor: {}});

            expect(ObjectId.isValid(next.actions[0].id)).toBe(true);
        });

        it('skips wiring an edge when previousActionId references a non-existent action', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            const next = insertWaitAction({detail, anchor: {previousActionId: 'does-not-exist'}});

            expect(next.actions).toHaveLength(2);
            expect(next.edges).toEqual([]);
        });

        it('skips wiring an edge when nextActionId references a non-existent action', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            const next = insertWaitAction({detail, anchor: {nextActionId: 'does-not-exist'}});

            expect(next.actions).toHaveLength(2);
            expect(next.edges).toEqual([]);
        });
    });

    describe('insertSendEmailAction', () => {
        it('creates a send_email action with placeholder defaults', () => {
            const detail = baseDetail([], []);

            const next = insertSendEmailAction({detail, anchor: {}});

            expect(next.actions).toHaveLength(1);
            const newAction = next.actions[0];
            expect(newAction.type).toBe('send_email');
            if (newAction.type === 'send_email') {
                expect(newAction.data.email_subject).toBe('Untitled email');
                expect(() => JSON.parse(newAction.data.email_lexical)).not.toThrow();
                expect(JSON.parse(newAction.data.email_lexical).root.children.length).toBeGreaterThan(0);
                expect(newAction.data.email_design_setting_id).toBe('placeholder');
            }
        });

        it('returns an action id that the backend schema treats as a valid ObjectId', () => {
            const next = insertSendEmailAction({detail: baseDetail([], []), anchor: {}});

            expect(ObjectId.isValid(next.actions[0].id)).toBe(true);
        });

        it('inserts at the head of a non-empty chain', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            const next = insertSendEmailAction({detail, anchor: {nextActionId: 'a'}});

            expect(next.actions).toHaveLength(2);
            const newAction = next.actions[1];
            expect(newAction.type).toBe('send_email');
            expect(next.edges).toEqual([{source_action_id: newAction.id, target_action_id: 'a'}]);
        });

        it('inserts at the tail of a non-empty chain', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            const next = insertSendEmailAction({detail, anchor: {previousActionId: 'a'}});

            expect(next.actions).toHaveLength(2);
            const newAction = next.actions[1];
            expect(newAction.type).toBe('send_email');
            expect(next.edges).toEqual([{source_action_id: 'a', target_action_id: newAction.id}]);
        });

        it('inserts between two existing actions by replacing one edge with two', () => {
            const detail = baseDetail(
                [
                    {id: 'a', type: 'wait', data: {wait_hours: 24}},
                    {id: 'b', type: 'wait', data: {wait_hours: 48}}
                ],
                [{source_action_id: 'a', target_action_id: 'b'}]
            );

            const next = insertSendEmailAction({detail, anchor: {previousActionId: 'a', nextActionId: 'b'}});

            expect(next.actions).toHaveLength(3);
            const newAction = next.actions[2];
            expect(newAction.type).toBe('send_email');
            expect(next.edges).toContainEqual({source_action_id: 'a', target_action_id: newAction.id});
            expect(next.edges).toContainEqual({source_action_id: newAction.id, target_action_id: 'b'});
            expect(next.edges).not.toContainEqual({source_action_id: 'a', target_action_id: 'b'});
            expect(next.edges).toHaveLength(2);
        });
    });
});
