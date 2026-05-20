import ObjectId from 'bson-objectid';
import {
    AutomationAction,
    AutomationDetail,
    AutomationSendEmailAction,
    InsertActionAnchor,
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

function expectSendEmailAction(action: AutomationAction): asserts action is AutomationSendEmailAction {
    expect(action.type).toBe('send_email');
}

const insertionCases: Array<{
    name: string;
    insert: (args: {detail: AutomationDetail; anchor: InsertActionAnchor}) => AutomationDetail;
    expectedType: AutomationAction['type'];
}> = [
    {name: 'insertWaitAction', insert: insertWaitAction, expectedType: 'wait'},
    {name: 'insertSendEmailAction', insert: insertSendEmailAction, expectedType: 'send_email'}
];

describe('automations api helpers', () => {
    describe('shared insertion behavior', () => {
        it('appends at the tail of a non-empty chain by wiring the previous tail to the new action', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            for (const {insert, expectedType} of insertionCases) {
                const next = insert({detail, anchor: {previousActionId: 'a'}});

                expect(next.actions).toHaveLength(2);
                const newAction = next.actions[1];
                expect(newAction.type).toBe(expectedType);
                expect(next.edges).toEqual([{source_action_id: 'a', target_action_id: newAction.id}]);
            }
        });

        it('inserts at the head by leaving the new action as the new head', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            for (const {insert, expectedType} of insertionCases) {
                const next = insert({detail, anchor: {nextActionId: 'a'}});

                expect(next.actions).toHaveLength(2);
                const newAction = next.actions[1];
                expect(newAction.type).toBe(expectedType);
                expect(next.edges).toEqual([{source_action_id: newAction.id, target_action_id: 'a'}]);
            }
        });

        it('inserts between two existing actions by replacing one edge with two', () => {
            const detail = baseDetail(
                [
                    {id: 'a', type: 'wait', data: {wait_hours: 24}},
                    {id: 'b', type: 'wait', data: {wait_hours: 48}}
                ],
                [{source_action_id: 'a', target_action_id: 'b'}]
            );

            for (const {insert, expectedType} of insertionCases) {
                const next = insert({detail, anchor: {previousActionId: 'a', nextActionId: 'b'}});

                expect(next.actions).toHaveLength(3);
                const newAction = next.actions[2];
                expect(newAction.type).toBe(expectedType);
                expect(next.edges).toContainEqual({source_action_id: 'a', target_action_id: newAction.id});
                expect(next.edges).toContainEqual({source_action_id: newAction.id, target_action_id: 'b'});
                expect(next.edges).not.toContainEqual({source_action_id: 'a', target_action_id: 'b'});
                expect(next.edges).toHaveLength(2);
            }
        });
    });

    describe('insertWaitAction', () => {
        it('creates a wait action with placeholder defaults', () => {
            const detail = baseDetail([], []);

            const next = insertWaitAction({detail, anchor: {}});

            expect(next.actions).toHaveLength(1);
            expect(next.actions[0]).toMatchObject({type: 'wait', data: {wait_hours: 24}});
            expect(next.edges).toEqual([]);
        });

        it('uses ObjectId-compatible action ids', () => {
            const next = insertWaitAction({detail: baseDetail([], []), anchor: {}});

            expect(ObjectId.isValid(next.actions[0].id)).toBe(true);
        });

        it('throws when previousActionId references a non-existent action', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            expect(() => insertWaitAction({detail, anchor: {previousActionId: 'does-not-exist'}})).toThrow(/unknown action id "does-not-exist"/);
        });

        it('throws when nextActionId references a non-existent action', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            expect(() => insertWaitAction({detail, anchor: {nextActionId: 'does-not-exist'}})).toThrow(/unknown action id "does-not-exist"/);
        });

        it('throws when inserting without an anchor into a non-empty automation', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            expect(() => insertWaitAction({detail, anchor: {}})).toThrow(/anchor is required/);
        });

        it('throws when inserting between actions that are not directly connected', () => {
            const detail = baseDetail(
                [
                    {id: 'a', type: 'wait', data: {wait_hours: 24}},
                    {id: 'b', type: 'wait', data: {wait_hours: 48}}
                ],
                []
            );

            expect(() => insertWaitAction({detail, anchor: {previousActionId: 'a', nextActionId: 'b'}})).toThrow(/anchor edge "a" -> "b" does not exist/);
        });

        it('throws when appending after an action that already has an outgoing edge', () => {
            const detail = baseDetail(
                [
                    {id: 'a', type: 'wait', data: {wait_hours: 24}},
                    {id: 'b', type: 'wait', data: {wait_hours: 48}}
                ],
                [{source_action_id: 'a', target_action_id: 'b'}]
            );

            expect(() => insertWaitAction({detail, anchor: {previousActionId: 'a'}})).toThrow(/previousActionId "a" is not the tail action/);
        });

        it('throws when prepending before an action that already has an incoming edge', () => {
            const detail = baseDetail(
                [
                    {id: 'a', type: 'wait', data: {wait_hours: 24}},
                    {id: 'b', type: 'wait', data: {wait_hours: 48}}
                ],
                [{source_action_id: 'a', target_action_id: 'b'}]
            );

            expect(() => insertWaitAction({detail, anchor: {nextActionId: 'b'}})).toThrow(/nextActionId "b" is not the head action/);
        });
    });

    describe('insertSendEmailAction', () => {
        it('creates a send_email action with placeholder defaults', () => {
            const detail = baseDetail([], []);

            const next = insertSendEmailAction({detail, anchor: {}});

            expect(next.actions).toHaveLength(1);
            const newAction = next.actions[0];
            expectSendEmailAction(newAction);
            expect(newAction.data.email_subject).toBe('Untitled email');
            expect(() => JSON.parse(newAction.data.email_lexical)).not.toThrow();
            expect(JSON.parse(newAction.data.email_lexical).root.children.length).toBeGreaterThan(0);
            expect(newAction.data.email_design_setting_id).toBe('placeholder');
        });

        it('returns an action id that the backend schema treats as a valid ObjectId', () => {
            const next = insertSendEmailAction({detail: baseDetail([], []), anchor: {}});

            expect(ObjectId.isValid(next.actions[0].id)).toBe(true);
        });
    });
});
