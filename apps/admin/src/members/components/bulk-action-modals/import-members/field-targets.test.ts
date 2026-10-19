import { type FieldTargetGroup, fieldTargets } from './field-targets';
import { type MemberCustomFieldCsvColumn } from '@tryghost/admin-x-framework/api/member-custom-fields';

const membershipFields = [
  { label: 'Email', value: 'email' },
  { label: 'Name', value: 'name' },
  { label: 'Subscribed to emails', value: 'subscribed_to_emails' },
];

const customColumn = (
  overrides: Partial<MemberCustomFieldCsvColumn> = {},
): MemberCustomFieldCsvColumn => ({
  value: 'metafields.custom.nickname',
  fieldName: 'Nickname',
  label: 'Nickname',
  type: 'short_text',
  ...overrides,
});

/** Every target across every section, for the assertions that are about the list as a whole. */
const allTargets = (groups: FieldTargetGroup[]) => groups.flatMap((group) => group.targets);

describe('field targets', () => {
  describe('fieldTargets', () => {
    it('gives a membership field the same halves every target carries', () => {
      const [group] = fieldTargets({
        membershipFields: [{ label: 'Name', value: 'name' }],
        customFieldColumns: [],
      });

      expect(group.targets).toEqual([
        {
          value: 'name',
          source: 'membership',
          fieldName: 'Name',
          label: 'Name',
          badge: null,
          ariaKind: null,
        },
      ]);
    });

    it("carries a custom field's type, name and part through", () => {
      const groups = fieldTargets({
        membershipFields: [],
        customFieldColumns: [
          customColumn({
            value: 'metafields.custom.shipping_address.city',
            fieldName: 'Shipping Address',
            partLabel: 'City',
            label: 'Shipping Address (City)',
            type: 'address',
          }),
        ],
      });

      expect(allTargets(groups)).toEqual([
        {
          value: 'metafields.custom.shipping_address.city',
          source: 'custom',
          fieldName: 'Shipping Address',
          partLabel: 'City',
          label: 'Shipping Address (City)',
          type: 'address',
          badge: null,
          ariaKind: 'Custom field',
        },
      ]);
    });

    it('leaves a one-column field with no part at all', () => {
      const [target] = allTargets(
        fieldTargets({ membershipFields: [], customFieldColumns: [customColumn()] }),
      );

      expect(target).not.toHaveProperty('partLabel');
    });
  });

  describe('sections', () => {
    it('heads each section with the kind under it, in the order they are declared in', () => {
      const groups = fieldTargets({ membershipFields, customFieldColumns: [customColumn()] });

      expect(groups.map((group) => [group.source, group.heading])).toEqual([
        ['membership', 'Membership fields'],
        ['custom', 'Custom fields'],
      ]);
    });

    // A section with nothing under it would still be announced, so a site with custom fields
    // off must not be offered the heading at all.
    it('drops a section nothing falls into', () => {
      const groups = fieldTargets({ membershipFields, customFieldColumns: [] });

      expect(groups.map((group) => group.source)).toEqual(['membership']);
    });

    it('offers no section at all when there is nothing to offer', () => {
      expect(fieldTargets({ membershipFields: [], customFieldColumns: [] })).toEqual([]);
    });
  });

  // The badge tells two same-named targets apart. It is a fact about the list rather than the
  // field, so it is settled here and the picker only shows what it is given.
  describe('badge', () => {
    const badged = (groups: FieldTargetGroup[]) =>
      allTargets(groups)
        .filter((target) => target.badge !== null)
        .map((target) => [target.label, target.badge]);

    it('marks a custom field a membership field has the name of', () => {
      const groups = fieldTargets({
        membershipFields,
        customFieldColumns: [customColumn({ fieldName: 'Name', label: 'Name' })],
      });

      // Only the custom one is marked: membership is the kind a reader assumes, so naming it
      // would mark both halves of the pair and tell them apart no better than marking neither.
      expect(badged(groups)).toEqual([['Name', 'Custom']]);
    });

    it('leaves a name no other source offers unmarked', () => {
      const groups = fieldTargets({ membershipFields, customFieldColumns: [customColumn()] });

      expect(badged(groups)).toEqual([]);
    });

    it('counts a name differing only in case or space as the same name', () => {
      const groups = fieldTargets({
        membershipFields,
        customFieldColumns: [customColumn({ fieldName: ' name ', label: ' name ' })],
      });

      expect(badged(groups)).toEqual([[' name ', 'Custom']]);
    });

    it('does not mark a composite part that shares only its field name', () => {
      const groups = fieldTargets({
        membershipFields,
        customFieldColumns: [
          customColumn({
            value: 'metafields.custom.name.city',
            fieldName: 'Name',
            partLabel: 'City',
            label: 'Name (City)',
            type: 'address',
          }),
        ],
      });

      expect(badged(groups)).toEqual([]);
    });

    it('marks only against the targets in the list it is given', () => {
      const custom = [
        customColumn({ value: 'metafields.custom.tier', fieldName: 'Tier', label: 'Tier' }),
      ];

      expect(badged(fieldTargets({ membershipFields, customFieldColumns: custom }))).toEqual([]);
      expect(
        badged(
          fieldTargets({
            membershipFields: [...membershipFields, { label: 'Tier', value: 'import_tier' }],
            customFieldColumns: custom,
          }),
        ),
      ).toEqual([['Tier', 'Custom']]);
    });
  });

  // Read out with the selection, so a custom field is not announced as a membership one.
  describe('accessible kind', () => {
    it('names a custom field in full, and says nothing for a membership field', () => {
      const groups = fieldTargets({
        membershipFields: [{ label: 'Name', value: 'name' }],
        customFieldColumns: [customColumn()],
      });

      expect(allTargets(groups).map((target) => [target.label, target.ariaKind])).toEqual([
        ['Name', null],
        ['Nickname', 'Custom field'],
      ]);
    });

    // Unlike the badge, which only appears where something else shares the label.
    it('names the kind whether or not the label is shared', () => {
      const groups = fieldTargets({
        membershipFields,
        customFieldColumns: [customColumn({ fieldName: 'Name', label: 'Name' })],
      });

      expect(
        allTargets(groups)
          .filter((target) => target.source === 'custom')
          .map((target) => target.ariaKind),
      ).toEqual(['Custom field']);
    });
  });
});
