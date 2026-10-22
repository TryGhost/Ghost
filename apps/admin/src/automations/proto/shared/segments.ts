import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// Segments — STAGED, not built.
//
// Segments don't exist in Ghost yet. Another team is building them, and the
// shape they've described is a saved members view: you assemble conditions and
// save the result under a name you can target. The admin already has most of
// that machinery (saved views live in the `shared_views` setting — see
// members/member-views), so this trigger is waiting on an API, not an idea.
//
// WHAT THIS FILE IS FOR, AND THE ONE THING IT HAS TO PROVE
//
// Not the segmentation feature. No NQL, no nesting, no or-groups, and no claim
// that the operators here are the ones segmentation will ship with.
//
// Conditions ARE evaluated, though — see shared/member-fixtures, which filters a
// fixture member set with them. That's deliberately narrow: the builder shows a
// matching-members list, and a list that didn't move when you added a condition
// would be obviously fake the first time anyone tried it. Naive evaluation over
// 32 fixtures is the cheapest way to make the thing honest.
//
// What it does have to carry is CREATION, because that's the part the team
// reacted to. The rejected version of this story is: you're building an
// automation, you need a segment that doesn't exist, so you leave, navigate to
// segments, build one, come back, and find your place again. Creation at the
// point of contact is the whole argument, and an affordance is the only way to
// show it.
//
// Which is also why creating here isn't the labels-style "type a name and press
// Create". A label IS a name, so that's honest for labels. A segment is its
// conditions — and the thing a publisher would have context-switched away to
// use is a BUILDER. A name-only create would quietly teach that a segment is a
// label, and the objection being staged would evaporate. So the builder appears
// in place, with real condition rows, and saving drops you back on the trigger
// with the new segment selected.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// STATUS, 2026-09-28: creation is PARKED.
//
// A builder was prototyped here — a modal with filter chips over a fixture
// member set — and removed. It was hand-rolled, and the plan is to reuse the
// members filtering experience rather than imitate it; a lookalike reads as a
// proposal for new UI when the intent is to reuse what already exists.
//
// What actually blocks it: `useMemberFilterFields`, the members filter catalog
// with its async value sources, lives in apps/admin/src/members, and the repo's
// dependency rules only let a domain reach another through its `api.ts`. Moving
// that catalog somewhere shared is the work; the container is a day.
//
// The trigger field still shows a "New segment" row, DISABLED, so the demo keeps
// saying creation belongs at the point of contact — which is the part the team
// reacted to. `createSegment` and `isSegmentNameTaken` below have no caller
// today and are kept for whatever picks this back up; delete them if that turns
// out to be someone else's design.
// ---------------------------------------------------------------------------

/** One condition in a segment, as a publisher assembled it. */
export interface SegmentCondition {
  /** A member property, by id — see CONDITION_FIELDS. */
  field: string;
  /** How it's compared, by id — see the field's own operators. */
  operator: string;
  /** Whatever was typed or picked. A string; member-fixtures coerces as needed. */
  value: string;
}

export interface ProtoSegment {
  id: string;
  name: string;
  conditions: SegmentCondition[];
}

/**
 * The properties a segment can be built on.
 *
 * Deliberately WIDER than Ghost's member filters are today. Country and age
 * aren't member columns — they're custom member fields (see
 * shared/member-custom-fields and packages/metafield-types), and a segmentation
 * feature that couldn't reach them would not be the one anyone is asking for.
 * The canonical example of a segment in this project is "lives in the US and is
 * over 30", so the builder has to be able to express exactly that or it's
 * illustrating something other than what was pitched.
 *
 * A deliberately short list. It exists so the builder has believable rows, not
 * so the proto can model Ghost's filter vocabulary.
 */
export const CONDITION_FIELDS: {
  id: string;
  label: string;
  operators: { id: string; label: string }[];
  placeholder: string;
}[] = [
  {
    id: 'country',
    label: 'Country',
    operators: [
      { id: 'is', label: 'is' },
      { id: 'is_not', label: 'is not' },
    ],
    placeholder: 'United States',
  },
  {
    id: 'age',
    label: 'Age',
    operators: [
      { id: 'over', label: 'is over' },
      { id: 'under', label: 'is under' },
    ],
    placeholder: '30',
  },
  {
    id: 'tier',
    label: 'Tier',
    operators: [
      { id: 'is', label: 'is' },
      { id: 'is_not', label: 'is not' },
    ],
    placeholder: 'Gold',
  },
  {
    id: 'emails_opened',
    label: 'Emails opened',
    operators: [
      { id: 'over', label: 'is more than' },
      { id: 'under', label: 'is fewer than' },
    ],
    placeholder: '5',
  },
  {
    id: 'signed_up',
    label: 'Signed up',
    operators: [
      { id: 'before', label: 'before' },
      { id: 'after', label: 'after' },
    ],
    placeholder: '1 Jan 2026',
  },
];

export const conditionField = (fieldId: string) =>
  CONDITION_FIELDS.find((field) => field.id === fieldId) ?? CONDITION_FIELDS[0];

/**
 * A segment's conditions as one readable line — "Country is United States and
 * age is over 30" — for the trigger card, which shows what the chosen segment
 * actually watches rather than only what it's called.
 *
 * Joined with "and" and only "and". Real segmentation will want or/nested
 * groups; a builder offering them would be a builder, which this isn't. Stated
 * here rather than discovered later.
 *
 * Sentence case after the first condition, so the line reads as prose instead of
 * a row of field names.
 */
export const conditionsSentence = (conditions: SegmentCondition[]): string =>
  conditions
    .filter((condition) => condition.value.trim())
    .map((condition, index) => {
      const field = conditionField(condition.field);
      const operator =
        field.operators.find((entry) => entry.id === condition.operator)?.label ??
        field.operators[0].label;
      const name = index === 0 ? field.label : field.label.toLowerCase();
      return `${name} ${operator} ${condition.value.trim()}`;
    })
    .join(' and ');

// Seeded segments, written as a publisher's own rather than as demo data: a
// couple demographic, a couple behavioural, so the list reads as something
// somebody assembled instead of a set of built-ins. The first is the project's
// canonical example.
const SEED: ProtoSegment[] = [
  {
    id: 'us-over-30',
    name: 'US readers over 30',
    conditions: [
      { field: 'country', operator: 'is', value: 'United States' },
      { field: 'age', operator: 'over', value: '30' },
    ],
  },
  {
    id: 'engaged-free',
    name: 'Engaged free members',
    conditions: [
      { field: 'tier', operator: 'is', value: 'Free' },
      { field: 'emails_opened', operator: 'over', value: '5' },
    ],
  },
  {
    id: 'at-risk',
    name: 'At-risk paid members',
    conditions: [
      { field: 'tier', operator: 'is', value: 'Gold' },
      { field: 'emails_opened', operator: 'under', value: '1' },
    ],
  },
  {
    id: 'early-supporters',
    name: 'Early supporters',
    conditions: [{ field: 'signed_up', operator: 'before', value: '1 Jan 2025' }],
  },
];

const VERSION = 1;
const STORAGE_KEY = 'ghost-automations-proto-segments';

interface SegmentState {
  version: number;
  segments: ProtoSegment[];
}

const read = (): SegmentState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { version: VERSION, segments: SEED };
    }
    const parsed = JSON.parse(raw) as SegmentState;
    if (parsed?.version !== VERSION || !Array.isArray(parsed.segments)) {
      return { version: VERSION, segments: SEED };
    }
    return parsed;
  } catch {
    return { version: VERSION, segments: SEED };
  }
};

const write = (next: SegmentState) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable — the list still works for this session
  }
};

// Same referential-stability contract as the other two stores.
let state: SegmentState | null = null;
const listeners = new Set<() => void>();

const snapshot = (): SegmentState => {
  state ??= read();
  return state;
};

const commit = (next: SegmentState) => {
  state = next;
  write(next);
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useSegments = (): ProtoSegment[] =>
  useSyncExternalStore(
    subscribe,
    () => snapshot().segments,
    () => snapshot().segments,
  );

export const getSegments = (): ProtoSegment[] => snapshot().segments;

export const segmentName = (segmentId: string | null): string | null =>
  segmentId === null ? null : (getSegments().find((s) => s.id === segmentId)?.name ?? null);

export const getSegment = (segmentId: string | null): ProtoSegment | null =>
  segmentId === null ? null : (getSegments().find((s) => s.id === segmentId) ?? null);

export const isSegmentNameTaken = (name: string): boolean => {
  const normalized = name.trim().toLowerCase();
  return getSegments().some((segment) => segment.name.trim().toLowerCase() === normalized);
};

const nextSegmentId = (name: string, existing: ProtoSegment[]): string => {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'segment';
  if (!existing.some((segment) => segment.id === base)) {
    return base;
  }
  let suffix = 2;
  while (existing.some((segment) => segment.id === `${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
};

/**
 * Create a segment and hand it back, so the caller can select it in the same
 * gesture. That last part is the point of the whole feature: you came here to
 * build an automation, and creating the segment shouldn't be a detour you have
 * to find your way back from.
 */
export const createSegment = (name: string, conditions: SegmentCondition[]): ProtoSegment => {
  const current = snapshot().segments;
  const created: ProtoSegment = {
    id: nextSegmentId(name, current),
    name: name.trim(),
    // Blank rows are dropped rather than saved empty — a half-filled condition
    // is a row someone abandoned, not a rule.
    conditions: conditions.filter((condition) => condition.value.trim()),
  };
  commit({ version: VERSION, segments: [...current, created] });
  return created;
};

/** Part of the lane switcher's reset — invented segments are prototype data. */
export const resetSegments = (): void => commit({ version: VERSION, segments: SEED });
