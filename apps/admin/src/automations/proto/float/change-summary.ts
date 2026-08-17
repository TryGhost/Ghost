import type {AutomationAction, AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {type TriggerConfig, exitCriterion, tierNames, triggerLabel} from '@/automations/proto/shared/trigger-config';
import {formatWait, orderActions} from '@/automations/proto/surface/flow-utils';

// What's in the draft that isn't live yet, as a plain list.
//
// With no edit mode and autosave running, "you have unpublished changes" is easy
// to say and hard to act on — the publisher has no way to remember what they
// changed three minutes ago. This turns the draft/published gap into something
// readable, so publishing is a decision rather than a leap.
//
// Deliberately shallow: it reports the fields the proto can actually edit. Email
// *content* isn't diffed because the proto doesn't edit it.

export interface ChangeEntry {
    id: string;
    label: string;
}

interface ChangeSummaryInput {
    published: AutomationDetail;
    draft: AutomationDetail;
    publishedTrigger: TriggerConfig;
    draftTrigger: TriggerConfig;
}

const emailLabel = (subject: string): string => (subject.trim() ? `“${subject.trim()}”` : 'an untitled email');

const describe = (action: AutomationAction): string => (
    action.type === 'send_email'
        ? `email ${emailLabel(action.data.email_subject)}`
        : `a ${formatWait(action.data.wait_hours)} wait`
);

// Which tiers the trigger watches, as one comparable string.
const tierText = (config: TriggerConfig): string => (
    config.tierScope === 'specific' && config.tierIds.length > 0
        ? tierNames(config.tierIds).join(', ')
        : 'any paid tier'
);

export function changeSummary({published, draft, publishedTrigger, draftTrigger}: ChangeSummaryInput): ChangeEntry[] {
    const changes: ChangeEntry[] = [];

    if (publishedTrigger.type !== draftTrigger.type) {
        changes.push({id: 'trigger-type', label: `Trigger changed to ${triggerLabel(draftTrigger)}`});
    }

    // Only meaningful while the trigger is the paid one — otherwise tiers aren't
    // part of what's running.
    if (draftTrigger.type === 'paid_subscription_starts' && tierText(publishedTrigger) !== tierText(draftTrigger)) {
        changes.push({id: 'trigger-tiers', label: `Paid tiers changed to ${tierText(draftTrigger)}`});
    }

    const publishedCriteria = new Set(publishedTrigger.exitCriteria);
    const draftCriteria = new Set(draftTrigger.exitCriteria);
    // Criteria labels are bare verb phrases ("Cancel subscription") because their
    // section supplies the subject, so they need one here too.
    draftTrigger.exitCriteria
        .filter(criterion => !publishedCriteria.has(criterion))
        .forEach(criterion => changes.push({id: `criterion-add-${criterion}`, label: `Members now exit when they ${exitCriterion(criterion).label.toLowerCase()}`}));
    publishedTrigger.exitCriteria
        .filter(criterion => !draftCriteria.has(criterion))
        .forEach(criterion => changes.push({id: `criterion-remove-${criterion}`, label: `Members no longer exit when they ${exitCriterion(criterion).label.toLowerCase()}`}));

    const publishedActions = orderActions(published);
    const draftActions = orderActions(draft);
    const publishedById = new Map(publishedActions.map(action => [action.id, action]));
    const draftById = new Map(draftActions.map(action => [action.id, action]));

    draftActions
        .filter(action => !publishedById.has(action.id))
        .forEach(action => changes.push({id: `add-${action.id}`, label: `Added ${describe(action)}`}));
    publishedActions
        .filter(action => !draftById.has(action.id))
        .forEach(action => changes.push({id: `remove-${action.id}`, label: `Removed ${describe(action)}`}));

    // Steps that exist on both sides, changed in place.
    draftActions.forEach((action) => {
        const before = publishedById.get(action.id);
        if (!before) {
            return;
        }
        if (action.type === 'send_email' && before.type === 'send_email' && before.data.email_subject !== action.data.email_subject) {
            changes.push({id: `subject-${action.id}`, label: `Subject changed to ${emailLabel(action.data.email_subject)}`});
        }
        if (action.type === 'wait' && before.type === 'wait' && before.data.wait_hours !== action.data.wait_hours) {
            changes.push({id: `wait-${action.id}`, label: `Wait changed from ${formatWait(before.data.wait_hours)} to ${formatWait(action.data.wait_hours)}`});
        }
    });

    return changes;
}
