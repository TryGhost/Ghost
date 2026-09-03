import {
  CUSTOM_FIELD_SET_OPERATORS,
  customFieldAddressing,
  metafieldFieldId,
} from './custom-fields/addressing';
import {
  FUTURE_TIMESTAMP_OPERATORS,
  PAST_TIMESTAMP_OPERATORS,
  FILTER_TYPES,
  type FieldDescriptor,
  buildCatalog,
  domainField,
  columnAddressing,
} from '@/shared/filters';
import { NEWSLETTER_FIELD } from './newsletter-filter-fields';
import { feedbackSemantics, subscriptionSemantics } from './member-value-semantics';
import { MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FIELD } from './multiple-active-subscriptions';

const SUBSCRIPTION_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'trialing', label: 'Trialing' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'incomplete_expired', label: 'Incomplete - Expired' },
];

const MEMBER_FIELDS = [
  {
    key: 'name',
    icon: 'person',
    type: 'text',
    ui: { label: 'Name', placeholder: 'Enter name...', className: 'w-48' },
  },
  {
    key: 'email',
    icon: 'mail',
    type: 'text',
    ui: { label: 'Email', placeholder: 'Enter email...', className: 'w-48' },
  },
  {
    key: 'label',
    icon: 'tag',
    type: 'set',
    ui: { label: 'Label', searchable: true, className: 'w-64' },
    metadata: { activeColumn: { key: 'labels', label: 'Labels' }, columnInclude: 'labels' },
  },
  domainField({
    key: 'subscribed',
    icon: 'mail',
    semantics: subscriptionSemantics(),
    operators: FILTER_TYPES.scalar.operators,
    ui: { label: 'Newsletter subscription', type: 'select', searchable: false },
    options: [
      { value: 'subscribed', label: 'Subscribed' },
      { value: 'unsubscribed', label: 'Unsubscribed' },
      { value: 'email-disabled', label: 'Email disabled' },
    ],
  }),
  {
    key: 'last_seen_at',
    icon: 'eye',
    type: 'timestamp',
    operators: PAST_TIMESTAMP_OPERATORS,
    ui: { label: 'Last seen' },
  },
  {
    key: 'created_at',
    icon: 'calendar',
    type: 'timestamp',
    operators: PAST_TIMESTAMP_OPERATORS,
    ui: { label: 'Created' },
  },
  {
    key: 'signup',
    icon: 'person-plus',
    type: 'scalar',
    valueConfig: { quoteStrings: true },
    ui: {
      label: 'Signed up on post/page',
      searchable: true,
      placeholder: 'Select a post or page...',
      className: 'w-64',
    },
  },
  {
    key: 'tier_id',
    icon: 'card',
    type: 'set',
    ui: { label: 'Membership tier', searchable: true, className: 'w-64' },
    metadata: { activeColumn: { key: 'tiers', label: 'Tiers' }, columnInclude: 'tiers' },
  },
  {
    key: 'status',
    icon: 'person-circle',
    type: 'scalar',
    ui: { label: 'Member status', searchable: false },
    options: [
      { value: 'paid', label: 'Paid' },
      { value: 'free', label: 'Free' },
      { value: 'comped', label: 'Complimentary' },
    ],
  },
  {
    key: 'subscriptions.plan_interval',
    icon: 'calendar-clock',
    type: 'scalar',
    ui: { label: 'Billing period', searchable: false },
    options: [
      { value: 'month', label: 'Monthly' },
      { value: 'year', label: 'Yearly' },
    ],
    metadata: {
      activeColumn: { key: 'subscriptions.plan_interval', label: 'Billing period' },
      columnInclude: 'subscriptions',
    },
  },
  {
    key: 'subscriptions.status',
    icon: 'card',
    type: 'scalar',
    ui: { label: 'Stripe subscription status', searchable: false },
    options: SUBSCRIPTION_STATUS_OPTIONS,
    metadata: {
      activeColumn: { key: 'subscriptions.status', label: 'Subscription status' },
      columnInclude: 'subscriptions',
    },
  },
  {
    key: 'subscriptions.start_date',
    icon: 'calendar-start',
    type: 'timestamp',
    operators: PAST_TIMESTAMP_OPERATORS,
    ui: { label: 'Paid start date' },
    metadata: {
      activeColumn: { key: 'subscriptions.start_date', label: 'Paid start date' },
      columnInclude: 'subscriptions',
    },
  },
  {
    key: 'subscriptions.current_period_end',
    icon: 'calendar-end',
    type: 'timestamp',
    operators: FUTURE_TIMESTAMP_OPERATORS,
    ui: { label: 'Next billing date' },
    metadata: {
      activeColumn: { key: 'subscriptions.current_period_end', label: 'Next billing date' },
      columnInclude: 'subscriptions',
    },
  },
  {
    key: 'conversion',
    icon: 'arrows',
    type: 'scalar',
    valueConfig: { quoteStrings: true },
    ui: {
      label: 'Subscription started on post/page',
      searchable: true,
      placeholder: 'Select a post or page...',
      className: 'w-64',
    },
  },
  {
    key: 'email_count',
    icon: 'send',
    type: 'number',
    ui: {
      label: 'Emails sent (all time)',
      defaultOperator: 'is-greater',
      min: 0,
      className: 'w-24',
    },
  },
  {
    key: 'email_opened_count',
    icon: 'mail-open',
    type: 'number',
    ui: {
      label: 'Emails opened (all time)',
      defaultOperator: 'is-greater',
      min: 0,
      className: 'w-24',
    },
  },
  {
    key: 'email_open_rate',
    icon: 'percent',
    type: 'number',
    ui: {
      label: 'Open rate (all time)',
      defaultOperator: 'is-greater',
      min: 0,
      max: 100,
      suffix: '%',
      className: 'w-24',
    },
  },
  {
    key: 'emails.post_id',
    icon: 'send',
    type: 'scalar',
    valueConfig: { quoteStrings: true },
    ui: {
      label: 'Sent email',
      searchable: true,
      placeholder: 'Select an email...',
      className: 'w-64',
    },
  },
  {
    key: 'opened_emails.post_id',
    icon: 'mail-open',
    type: 'scalar',
    valueConfig: { quoteStrings: true },
    ui: {
      label: 'Opened email',
      searchable: true,
      placeholder: 'Select an email...',
      className: 'w-64',
    },
  },
  {
    key: 'clicked_links.post_id',
    icon: 'click',
    type: 'scalar',
    valueConfig: { quoteStrings: true },
    ui: {
      label: 'Clicked email',
      searchable: true,
      placeholder: 'Select an email...',
      className: 'w-64',
    },
  },
  domainField({
    key: 'newsletter_feedback',
    icon: 'message',
    semantics: feedbackSemantics(),
    addressing: columnAddressing({ field: 'feedback.post_id' }),
    operators: ['1', '0'],
    ui: {
      label: 'Responded with feedback',
      type: 'select',
      searchable: true,
      placeholder: 'Select an email...',
      className: 'w-64',
      defaultOperator: '1',
    },
  }),
  {
    key: 'offer_redemptions',
    icon: 'ticket',
    type: 'set',
    valueConfig: { quoteStrings: true, serializeSingletonAsScalar: true },
    ui: { label: 'Offer', searchable: true, className: 'w-64' },
    metadata: { activeColumn: { key: 'offer_redemptions', label: 'Offer' } },
  },
  {
    key: MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FIELD,
    icon: 'layers',
    type: 'count',
    valueConfig: { threshold: 1, absentForm: 'below' },
    ui: {
      label: 'Multiple active subscriptions',
      type: 'select',
      searchable: false,
      hideOperatorSelect: true,
    },
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
  },
] as const satisfies readonly FieldDescriptor[];

export const CUSTOM_FIELD_OPERATORS = [
  ...FILTER_TYPES.text.operators,
  ...CUSTOM_FIELD_SET_OPERATORS,
];

export { METAFIELDS_FIELD_PREFIX, parseMetafieldFieldId } from './custom-fields/addressing';

const CUSTOM_FIELD: FieldDescriptor = {
  key: 'metafields.:namespace.:key',
  icon: 'text',
  type: 'text',
  addressing: customFieldAddressing(),
  operators: CUSTOM_FIELD_OPERATORS,
  ui: {
    label: 'Custom field',
    type: 'custom',
  },
  metadata: {
    // One column per field filtered on, named after the field itself. A value a
    // publisher collected varies member to member, which is what earns a column;
    // it is shown whatever the operator, the way Label is. No name resolved means
    // no such field for this site (or the flag is off), so no column either.
    activeColumn: ({ params, label }) =>
      label && params.namespace && params.key
        ? { key: metafieldFieldId({ namespace: params.namespace, key: params.key }), label }
        : null,
    // Asked for as soon as a custom field is filtered on: the values are what the column will
    // hold, and they travel on the request the filter already sends. The API accepts the
    // include on every site and returns values only where fields are defined, so it needs no
    // feature detection.
    columnInclude: 'metafields',
  },
};

export type StaticMemberFieldKey = (typeof MEMBER_FIELDS)[number]['key'];

export const MEMBER_FIELD_DESCRIPTORS: FieldDescriptor[] = [
  ...MEMBER_FIELDS,
  NEWSLETTER_FIELD,
  CUSTOM_FIELD,
];

export const memberFields = buildCatalog(MEMBER_FIELD_DESCRIPTORS);

export type MemberFields = typeof memberFields;

export function getMemberFields(): MemberFields {
  return memberFields;
}
