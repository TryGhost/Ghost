import ObjectId from 'bson-objectid';
import {
    AutomationAction,
    AutomationDetail,
    AutomationSendEmailAction,
    InsertActionAnchor,
    insertSendEmailAction,
    insertWaitAction,
    removeAction,
    updateSendEmailAction,
    updateWaitAction
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
        it('creates a wait action with default values', () => {
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
        it('creates a send_email action with a blank body and default subject', () => {
            const detail = baseDetail([], []);

            const next = insertSendEmailAction({detail, anchor: {}});

            expect(next.actions).toHaveLength(1);
            const newAction = next.actions[0];
            expectSendEmailAction(newAction);
            expect(newAction.data.email_subject).toBe('');
            expect(() => JSON.parse(newAction.data.email_lexical)).not.toThrow();
            expect(JSON.parse(newAction.data.email_lexical).root.children).toEqual([]);
            expect(newAction.data.email_design_setting_id).toBe('default-automated-email');
        });

        it('returns an action id that the backend schema treats as a valid ObjectId', () => {
            const next = insertSendEmailAction({detail: baseDetail([], []), anchor: {}});

            expect(ObjectId.isValid(next.actions[0].id)).toBe(true);
        });
    });

    describe('removeAction', () => {
        it('removes the only step and leaves the automation empty', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            const next = removeAction({detail, actionId: 'a'});

            expect(next.actions).toEqual([]);
            expect(next.edges).toEqual([]);
        });

        it('removes the head step, promoting the second action to head', () => {
            const detail = baseDetail(
                [
                    {id: 'a', type: 'wait', data: {wait_hours: 24}},
                    {id: 'b', type: 'wait', data: {wait_hours: 48}}
                ],
                [{source_action_id: 'a', target_action_id: 'b'}]
            );

            const next = removeAction({detail, actionId: 'a'});

            expect(next.actions.map(action => action.id)).toEqual(['b']);
            expect(next.edges).toEqual([]);
        });

        it('removes the tail step, leaving the previous action as the new tail', () => {
            const detail = baseDetail(
                [
                    {id: 'a', type: 'wait', data: {wait_hours: 24}},
                    {id: 'b', type: 'wait', data: {wait_hours: 48}}
                ],
                [{source_action_id: 'a', target_action_id: 'b'}]
            );

            const next = removeAction({detail, actionId: 'b'});

            expect(next.actions.map(action => action.id)).toEqual(['a']);
            expect(next.edges).toEqual([]);
        });

        it('removes a middle step by stitching its neighbours together', () => {
            const detail = baseDetail(
                [
                    {id: 'a', type: 'wait', data: {wait_hours: 24}},
                    {id: 'b', type: 'wait', data: {wait_hours: 48}},
                    {id: 'c', type: 'wait', data: {wait_hours: 72}}
                ],
                [
                    {source_action_id: 'a', target_action_id: 'b'},
                    {source_action_id: 'b', target_action_id: 'c'}
                ]
            );

            const next = removeAction({detail, actionId: 'b'});

            expect(next.actions.map(action => action.id)).toEqual(['a', 'c']);
            expect(next.edges).toEqual([{source_action_id: 'a', target_action_id: 'c'}]);
        });

        it('throws when actionId references a non-existent action', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            expect(() => removeAction({detail, actionId: 'does-not-exist'})).toThrow(/unknown action id "does-not-exist"/);
        });
    });

    describe('updateWaitAction', () => {
        it('updates wait_hours on the targeted wait action', () => {
            const detail = baseDetail(
                [
                    {id: 'a', type: 'wait', data: {wait_hours: 24}},
                    {id: 'b', type: 'wait', data: {wait_hours: 48}}
                ],
                [{source_action_id: 'a', target_action_id: 'b'}]
            );

            const next = updateWaitAction({detail, actionId: 'a', waitHours: 5});

            expect(next.actions[0]).toEqual({id: 'a', type: 'wait', data: {wait_hours: 5}});
        });

        it('leaves other actions, edges, and top-level fields untouched', () => {
            const detail = baseDetail(
                [
                    {id: 'a', type: 'wait', data: {wait_hours: 24}},
                    {id: 'b', type: 'wait', data: {wait_hours: 48}}
                ],
                [{source_action_id: 'a', target_action_id: 'b'}]
            );

            const next = updateWaitAction({detail, actionId: 'a', waitHours: 72});

            expect(next.actions[1]).toBe(detail.actions[1]);
            expect(next.edges).toEqual(detail.edges);
            expect(next.id).toBe(detail.id);
            expect(next.slug).toBe(detail.slug);
            expect(next.status).toBe(detail.status);
        });

        it('throws when actionId references a non-existent action', () => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            expect(() => updateWaitAction({detail, actionId: 'does-not-exist', waitHours: 1})).toThrow(/unknown action id "does-not-exist"/);
        });

        it('throws when the targeted action is not a wait action', () => {
            const detail = baseDetail(
                [
                    {
                        id: 'a',
                        type: 'send_email',
                        data: {
                            email_subject: 'Hi',
                            email_lexical: '{}',
                            email_design_setting_id: 'default-automated-email'
                        }
                    }
                ],
                []
            );

            expect(() => updateWaitAction({detail, actionId: 'a', waitHours: 1})).toThrow(/is not a wait action/);
        });

        const expectInvalidWaitHoursRejected = (waitHours: number): void => {
            const detail = baseDetail(
                [{id: 'a', type: 'wait', data: {wait_hours: 24}}],
                []
            );

            expect(() => updateWaitAction({detail, actionId: 'a', waitHours})).toThrow(/waitHours must be a safe positive integer/);
            expect(detail.actions).toEqual([{id: 'a', type: 'wait', data: {wait_hours: 24}}]);
            expect(detail.edges).toEqual([]);
        };

        it('throws when waitHours is zero', () => {
            expectInvalidWaitHoursRejected(0);
        });

        it('throws when waitHours is negative', () => {
            expectInvalidWaitHoursRejected(-1);
        });

        it('throws when waitHours is fractional', () => {
            expectInvalidWaitHoursRejected(1.5);
        });

        it('throws when waitHours is out of the double precision range', () => {
            expectInvalidWaitHoursRejected(Number.MAX_SAFE_INTEGER + 1);
        });

        it('throws when waitHours is Infinity', () => {
            expectInvalidWaitHoursRejected(Number.POSITIVE_INFINITY);
        });

        it('throws when waitHours is NaN', () => {
            expectInvalidWaitHoursRejected(Number.NaN);
        });
    });

    describe('updateSendEmailAction', () => {
        const sendEmailAction = (id: string, overrides: Partial<AutomationSendEmailAction['data']> = {}): AutomationSendEmailAction => ({
            id,
            type: 'send_email',
            data: {
                email_subject: 'Original subject',
                email_lexical: '{"root":{"children":[]}}',
                email_design_setting_id: 'default-automated-email',
                ...overrides
            }
        });

        it('updates subject and lexical on the targeted send_email action', () => {
            const detail = baseDetail([sendEmailAction('a')], []);

            const next = updateSendEmailAction({
                detail,
                actionId: 'a',
                emailSubject: 'New subject',
                emailLexical: '{"root":{"children":[{"type":"paragraph"}]}}'
            });

            const updated = next.actions[0];
            expectSendEmailAction(updated);
            expect(updated.data.email_subject).toBe('New subject');
            expect(updated.data.email_lexical).toBe('{"root":{"children":[{"type":"paragraph"}]}}');
        });

        it('updates subject and lexical, preserving the rest of data', () => {
            const detail = baseDetail([sendEmailAction('a', {email_design_setting_id: 'design-setting-id'})], []);

            const next = updateSendEmailAction({
                detail,
                actionId: 'a',
                emailSubject: 'Just the subject',
                emailLexical: '{"root":{"children":[{"type":"paragraph"}]}}'
            });

            const updated = next.actions[0];
            expectSendEmailAction(updated);
            expect(updated.data.email_subject).toBe('Just the subject');
            expect(updated.data.email_lexical).toBe('{"root":{"children":[{"type":"paragraph"}]}}');
            expect(updated.data.email_design_setting_id).toBe('design-setting-id');
        });

        it('does not mutate the original detail or action', () => {
            const detail = baseDetail([sendEmailAction('a')], []);

            updateSendEmailAction({detail, actionId: 'a', emailSubject: 'Changed', emailLexical: '{"root":{"children":[{"type":"paragraph"}]}}'});

            const original = detail.actions[0];
            expectSendEmailAction(original);
            expect(original.data.email_subject).toBe('Original subject');
        });

        it('leaves other actions, edges, and top-level fields untouched', () => {
            const detail = baseDetail(
                [sendEmailAction('a'), {id: 'b', type: 'wait', data: {wait_hours: 24}}],
                [{source_action_id: 'a', target_action_id: 'b'}]
            );

            const next = updateSendEmailAction({detail, actionId: 'a', emailSubject: 'New', emailLexical: '{"root":{"children":[]}}'});

            expect(next.actions[1]).toBe(detail.actions[1]);
            expect(next.edges).toEqual(detail.edges);
            expect(next.id).toBe(detail.id);
            expect(next.slug).toBe(detail.slug);
            expect(next.status).toBe(detail.status);
        });

        it('throws when actionId references a non-existent action', () => {
            const detail = baseDetail([sendEmailAction('a')], []);

            expect(() => updateSendEmailAction({detail, actionId: 'nope', emailSubject: 'x', emailLexical: '{"root":{"children":[]}}'})).toThrow(/unknown action id "nope"/);
        });

        it('throws when the targeted action is not a send_email action', () => {
            const detail = baseDetail([{id: 'a', type: 'wait', data: {wait_hours: 24}}], []);

            expect(() => updateSendEmailAction({detail, actionId: 'a', emailSubject: 'x', emailLexical: '{"root":{"children":[]}}'})).toThrow(/is not a send_email action/);
        });
    });
});
