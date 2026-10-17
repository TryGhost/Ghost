import type {
  AutomationAction,
  AutomationDetail,
} from '@tryghost/admin-x-framework/api/automations';

// ---------------------------------------------------------------------------
// The "Update member" action — the first step kind that isn't an email or a
// wait, and the first thing in this prototype that CHANGES a member rather than
// sending to one.
//
// Roadmap: Later, "Automated list hygiene". The three operations are the ones
// asked for, and they're deliberately not variations on a theme — one files a
// member (labels), one writes data to them (custom fields), one takes them off
// the list. What they share is that the automation is the actor and the member
// finds out later, if at all, which is why they're one card and not three.
//
// ---------------------------------------------------------------------------
// WHY THIS TYPE LIVES HERE AND NOT IN THE FRAMEWORK
//
// `AutomationAction` is a discriminated union in admin-x-framework, which the
// shipping editor, the serializer and the backend all read. Adding a third
// member to it would be editing shipping code on behalf of a feature nobody has
// committed to — and worse for this prototype, the type is shared, so phase 1
// and phase 2 would start believing in a step they can't build.
//
// So the action is modelled here in the shape the API would ship it: an id, a
// `type` discriminant, and a snake_case `data` bag, exactly like its two
// siblings. Same convention the run and metric shapes already follow (see
// mock/types) — net-new things are written as if they came from a future API,
// so adopting them upstream is a move rather than a rewrite.
//
// The cost is one seam, and it's named: `asApiDetail` below. Everything else in
// the proto works in ProtoAutomationDetail.
// ---------------------------------------------------------------------------

/** What the step does to the member. */
export type MemberUpdateOperation = 'label' | 'custom_field' | 'unsubscribe';

export interface UpdateMemberAction {
  id: string;
  type: 'update_member';
  data: {
    operation: MemberUpdateOperation;
    /**
     * Whether the label operation adds or takes away. Held for every operation
     * rather than only the label one, for the same reason TriggerConfig holds
     * tierMode on triggers that have no tiers: nothing has to null-check it,
     * and switching operation and back doesn't lose what you'd chosen.
     */
    label_mode: 'add' | 'remove';
    label_id: string | null;
    field_id: string | null;
    field_value: string;
  };
}

/**
 * An action as the PROTO knows them: the framework's two, plus ours.
 *
 * Deliberately a superset rather than a replacement — an email is still exactly
 * the framework's `AutomationSendEmailAction`, so nothing about the existing
 * cards changes and none of the shipping helpers have to be re-implemented.
 */
export type ProtoAction = AutomationAction | UpdateMemberAction;

export type ProtoAutomationDetail = Omit<AutomationDetail, 'actions'> & {
  actions: ProtoAction[];
};

/**
 * The seam. The framework's graph helpers (spliceAction and everything built on
 * it) take an `AutomationDetail`, and a detail carrying one of our actions isn't
 * one by the type's lights.
 *
 * It is by every other measure: those helpers only read `id`, `actions` and
 * `edges` — they splice by id and rewire edges, and never look at an action's
 * `type` or into its `data`. Verified by reading spliceAction, not assumed. So
 * the cast is safe in fact while being a lie in the types, which makes this
 * function the exact place the real API has to grow a third action type. One
 * named seam beats casts scattered at every call site.
 */
export const asApiDetail = (detail: ProtoAutomationDetail): AutomationDetail =>
  detail as AutomationDetail;

export const isUpdateMemberAction = (action: ProtoAction): action is UpdateMemberAction =>
  action.type === 'update_member';

// The operations, as the card offers them. "Add or remove a label" is ONE
// option carrying a direction rather than two options: the thing you're
// choosing at this level is which part of the member you're touching, and
// add-vs-remove is a detail of the label answer, not a fourth kind of step.
export const MEMBER_UPDATE_OPERATIONS: {
  value: MemberUpdateOperation;
  label: string;
}[] = [
  { value: 'label', label: 'Add or remove a label' },
  { value: 'custom_field', label: 'Update a custom field' },
  { value: 'unsubscribe', label: 'Unsubscribe from emails' },
];

/**
 * Proto-only custom field fixtures, standing in for the site's own — the same
 * job TIER_OPTIONS does for tiers.
 *
 * Ghost has custom member fields for real (see shared/member-custom-fields and
 * packages/metafield-types); these are a short believable set rather than a
 * model of that feature. Text only: a type-aware value input is a real design
 * question — dates want a picker, booleans want a switch — and answering it
 * here would be inventing a spec for someone else's field types.
 */
export const CUSTOM_FIELDS: { id: string; name: string; placeholder: string }[] = [
  { id: 'onboarding_stage', name: 'Onboarding stage', placeholder: 'Completed' },
  { id: 'favourite_topic', name: 'Favourite topic', placeholder: 'Product reviews' },
  { id: 'referral_source', name: 'Referral source', placeholder: 'Newsletter' },
];

export const customFieldName = (fieldId: string | null): string | null =>
  fieldId === null ? null : (CUSTOM_FIELDS.find((f) => f.id === fieldId)?.name ?? null);

export const blankUpdateMemberData = (): UpdateMemberAction['data'] => ({
  // Labels first, because it's the operation the roadmap card is actually about
  // and the one a publisher reaches for most. Unlike the trigger fields, the
  // OPERATION arrives answered: there are only three, the card has to show
  // something, and an empty operation select would make a step that hasn't
  // decided what kind of step it is.
  operation: 'label',
  label_mode: 'add',
  // What it acts ON is unanswered, though, and that's what blocks publishing.
  label_id: null,
  field_id: null,
  field_value: '',
});

/**
 * Whether the step still has a question open — the same idea as the trigger
 * fields' unanswered predicates, and read by the same validators.
 *
 * Unsubscribing is never incomplete: it takes no argument, which is the whole
 * reason it's the one operation with no second field.
 */
export const updateMemberIncomplete = (action: UpdateMemberAction): boolean => {
  // Read through `data` rather than destructured: these are the API's snake_case
  // field names, and pulling them into locals makes them local identifiers,
  // which the repo's camelcase rule then objects to — rightly. Every other
  // reader of an action's data does the same (see action.data.email_subject).
  const { data } = action;
  if (data.operation === 'label') {
    return data.label_id === null;
  }
  if (data.operation === 'custom_field') {
    return data.field_id === null || !data.field_value.trim();
  }
  return false;
};

/**
 * The step in a sentence — the card's subtitle, and the read canvas's summary.
 *
 * Written as what WILL happen to the member rather than as the configuration
 * that makes it happen ("Add the label SEO guide", not "Label / add / SEO
 * guide"), because the flow is read top to bottom as a sequence of events.
 *
 * Takes the label's name rather than looking it up: labels live in a store, and
 * this is called from render paths that have it to hand.
 */
export const updateMemberSummary = (
  action: UpdateMemberAction,
  labelName: string | null,
): string => {
  const { data } = action;
  if (data.operation === 'unsubscribe') {
    return 'Unsubscribe from all emails';
  }
  if (data.operation === 'label') {
    const verb = data.label_mode === 'add' ? 'Add the label' : 'Remove the label';
    return labelName ? `${verb} ${labelName}` : `${verb}…`;
  }
  const name = customFieldName(data.field_id);
  return name && data.field_value.trim()
    ? `Set ${name} to ${data.field_value.trim()}`
    : 'Update a field…';
};

/**
 * Insert an Update member step, mirroring the framework's own spliceAction.
 *
 * A copy rather than a call, because spliceAction isn't exported — only the two
 * `insertXAction` wrappers around it are, and each hard-codes the action it
 * builds. The edge rewiring below is that function's, line for line: drop the
 * anchor's edge, then wire previous → new and new → next for whichever ends
 * exist.
 *
 * Its guard clauses are deliberately NOT copied. They throw on anchors the UI
 * can't produce (a mid-chain node passed as the tail, an edge that doesn't
 * exist), and they're the framework's contract with callers it can't see. Here
 * the only caller is the canvas's own connector, which always hands over an
 * edge it just drew.
 *
 * When the real API grows this action type, this function is the other half of
 * what goes away — see asApiDetail.
 */
export const insertUpdateMemberAction = ({
  detail,
  anchor,
}: {
  detail: ProtoAutomationDetail;
  anchor: { previousActionId?: string; nextActionId?: string };
}): ProtoAutomationDetail => {
  const { previousActionId, nextActionId } = anchor;
  const action: UpdateMemberAction = {
    // The framework mints ids with crypto.randomUUID (see buildWaitAction); the
    // prefix is the proto's, so a step made here is recognisable in a dump.
    id: `act_update_${crypto.randomUUID().slice(0, 8)}`,
    type: 'update_member',
    data: blankUpdateMemberData(),
  };
  const actions = [...detail.actions, action];
  const edges = detail.edges.filter(
    (edge) =>
      !(edge.source_action_id === previousActionId && edge.target_action_id === nextActionId),
  );
  if (previousActionId !== undefined) {
    edges.push({ source_action_id: previousActionId, target_action_id: action.id });
  }
  if (nextActionId !== undefined) {
    edges.push({ source_action_id: action.id, target_action_id: nextActionId });
  }
  return { ...detail, actions, edges };
};
