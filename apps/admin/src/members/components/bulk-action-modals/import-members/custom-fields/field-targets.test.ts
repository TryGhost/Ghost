import { FIELD_SOURCES, FIELD_SOURCE_ORDER, fieldTargets } from './field-targets';
import { type MemberCustomFieldCsvColumn } from '@tryghost/admin-x-framework/api/member-custom-fields';

const membershipFields = [
  { label: 'Email', value: 'email' },
  { label: 'Name', value: 'name' },
  { label: 'Subscribed to emails', value: 'subscribed_to_emails' },
];

const customColumn = (
  overrides: Partial<MemberCustomFieldCsvColumn> = {},
): MemberCustomFieldCsvColumn => ({
  value: 'custom_fields.nickname',
  fieldName: 'Nickname',
  label: 'Nickname',
  type: 'short_text',
  ...overrides,
});

describe('field targets', () => {
  describe('fieldTargets', () => {
    it('gives a membership field the same two halves every target carries', () => {
      const [target] = fieldTargets({
        membershipFields: [{ label: 'Name', value: 'name' }],
        customFieldColumns: [],
      });

      expect(target).toEqual({
        value: 'name',
        source: 'membership',
        fieldName: 'Name',
        label: 'Name',
        contested: false,
      });
    });

    it("carries a custom field's type, name and part through", () => {
      const targets = fieldTargets({
        membershipFields: [],
        customFieldColumns: [
          customColumn({
            value: 'custom_fields.shipping_address.city',
            fieldName: 'Shipping Address',
            partLabel: 'City',
            label: 'Shipping Address (City)',
            type: 'address',
          }),
        ],
      });

      expect(targets).toEqual([
        {
          value: 'custom_fields.shipping_address.city',
          source: 'custom',
          fieldName: 'Shipping Address',
          partLabel: 'City',
          label: 'Shipping Address (City)',
          type: 'address',
          contested: false,
        },
      ]);
    });

    it('leaves a one-column field with no part at all', () => {
      const [target] = fieldTargets({ membershipFields: [], customFieldColumns: [customColumn()] });

      expect(target).not.toHaveProperty('partLabel');
    });

    it('offers the sources in the order they are declared in', () => {
      const targets = fieldTargets({ membershipFields, customFieldColumns: [customColumn()] });

      expect([...new Set(targets.map((target) => target.source))]).toEqual([...FIELD_SOURCE_ORDER]);
    });
  });

  describe('contested', () => {
    const contestedLabels = (targets: ReturnType<typeof fieldTargets>) =>
      targets.filter((target) => target.contested).map((target) => target.label);

    it('finds a custom field a membership field has the name of', () => {
      const targets = fieldTargets({
        membershipFields,
        customFieldColumns: [customColumn({ fieldName: 'Name', label: 'Name' })],
      });

      expect(contestedLabels(targets)).toEqual(['Name', 'Name']);
    });

    it('leaves a name no other source offers alone', () => {
      const targets = fieldTargets({ membershipFields, customFieldColumns: [customColumn()] });

      expect(contestedLabels(targets)).toEqual([]);
    });

    it('counts a name differing only in case or space as the same name', () => {
      const targets = fieldTargets({
        membershipFields,
        customFieldColumns: [customColumn({ fieldName: ' name ', label: ' name ' })],
      });

      expect(contestedLabels(targets)).toEqual(['Name', ' name ']);
    });

    it('does not contest a composite part that shares only its field name', () => {
      const targets = fieldTargets({
        membershipFields,
        customFieldColumns: [
          customColumn({
            value: 'custom_fields.name.city',
            fieldName: 'Name',
            partLabel: 'City',
            label: 'Name (City)',
            type: 'address',
          }),
        ],
      });

      expect(contestedLabels(targets)).toEqual([]);
    });

    it('contests only against the targets in the list it is given', () => {
      const custom = [
        customColumn({ value: 'custom_fields.tier', fieldName: 'Tier', label: 'Tier' }),
      ];

      expect(
        contestedLabels(fieldTargets({ membershipFields, customFieldColumns: custom })),
      ).toEqual([]);
      expect(
        contestedLabels(
          fieldTargets({
            membershipFields: [...membershipFields, { label: 'Tier', value: 'import_tier' }],
            customFieldColumns: custom,
          }),
        ),
      ).toEqual(['Tier', 'Tier']);
    });
  });

  describe('FIELD_SOURCES', () => {
    it('leaves exactly one source unmarked', () => {
      const unmarked = FIELD_SOURCE_ORDER.filter((source) => FIELD_SOURCES[source].badge === null);

      expect(unmarked).toEqual(['membership']);
    });

    it('names a marked source in full for the accessible name', () => {
      expect(FIELD_SOURCES.custom).toEqual({
        heading: 'Custom fields',
        badge: 'Custom',
        ariaKind: 'Custom field',
      });
    });
  });
});
