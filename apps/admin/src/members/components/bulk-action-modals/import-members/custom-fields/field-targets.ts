import {
  type MemberCustomField,
  type MemberCustomFieldCsvColumn,
} from '@tryghost/admin-x-framework/api/member-custom-fields';

export type FieldSource = FieldOffer['source'];

interface FieldFacts {
  /** The CSV column. Namespaced per source, so it identifies a target across all of them. */
  value: string;
  fieldName: string;
  partLabel?: string;
  /** `fieldName`, plus the part in brackets where there is one. Shown, and searched. */
  label: string;
}

type FieldOffer =
  | (FieldFacts & { source: 'membership' })
  | (FieldFacts & { source: 'custom'; type: MemberCustomField['type'] });

/**
 * One thing a CSV column can be imported as, as the picker shows it.
 *
 * The badge is settled here rather than left to the picker, because it is not a fact about the
 * field: whether "Tier" needs telling apart depends on whether tiers are on offer at all, which
 * only the whole list knows.
 */
export type FieldTarget = FieldOffer & {
  /** The kind, shown beside the label; null where no other source offers this label. */
  badge: string | null;
  /** The kind named in full, for the accessible name; null to say nothing. */
  ariaKind: string | null;
};

/** One section of the picker's list: what heads it, and what is under it. */
export interface FieldTargetGroup {
  source: FieldSource;
  heading: string;
  targets: FieldTarget[];
}

interface FieldSourcePresentation {
  heading: string;
  /** Null for the source a reader assumes. Exactly one source may be null. */
  badge: string | null;
  /** Named in full, for the accessible name; null to say nothing. */
  ariaKind: string | null;
}

const FIELD_SOURCES: Record<FieldSource, FieldSourcePresentation> = {
  membership: { heading: 'Membership fields', badge: null, ariaKind: null },
  custom: { heading: 'Custom fields', badge: 'Custom', ariaKind: 'Custom field' },
};

const FIELD_SOURCE_ORDER = Object.keys(FIELD_SOURCES) as FieldSource[];

/**
 * Everything a column can be imported as, sectioned as the picker offers it: in the order the
 * sources are declared in, and without a section nothing falls into — a site with custom fields
 * off is not told there is a Custom fields section and then shown nothing under it.
 *
 * The picker is handed this and nothing else, so where a target sits, what heads its section and
 * how it is named are all answered before it renders.
 */
export function fieldTargets({
  membershipFields,
  customFieldColumns,
}: {
  membershipFields: { label: string; value: string }[];
  customFieldColumns: MemberCustomFieldCsvColumn[];
}): FieldTargetGroup[] {
  const offers: FieldOffer[] = [
    ...membershipFields.map((field): FieldOffer => ({
      value: field.value,
      source: 'membership',
      fieldName: field.label,
      label: field.label,
    })),
    ...customFieldColumns.map((column): FieldOffer => ({
      value: column.value,
      source: 'custom',
      fieldName: column.fieldName,
      ...(column.partLabel === undefined ? {} : { partLabel: column.partLabel }),
      label: column.label,
      type: column.type,
    })),
  ];

  const contested = labelsSharedAcrossSources(offers);
  const targets = offers.map((offer): FieldTarget => ({
    ...offer,
    badge: contested.has(readsAs(offer)) ? FIELD_SOURCES[offer.source].badge : null,
    ariaKind: FIELD_SOURCES[offer.source].ariaKind,
  }));

  return FIELD_SOURCE_ORDER.map((source) => ({
    source,
    heading: FIELD_SOURCES[source].heading,
    targets: targets.filter((target) => target.source === source),
  })).filter((group) => group.targets.length > 0);
}

function readsAs(offer: { label: string }): string {
  return offer.label.trim().toLowerCase();
}

/**
 * Compared on the whole label, not on `fieldName`: an address field called "Name" reads
 * "Name (City)" beside the membership "Name", which already tells them apart.
 */
function labelsSharedAcrossSources(offers: FieldOffer[]): ReadonlySet<string> {
  const sourcesByLabel = new Map<string, Set<FieldSource>>();
  for (const offer of offers) {
    const sources = sourcesByLabel.get(readsAs(offer)) ?? new Set<FieldSource>();
    sources.add(offer.source);
    sourcesByLabel.set(readsAs(offer), sources);
  }

  return new Set(
    [...sourcesByLabel].filter(([, sources]) => sources.size > 1).map(([label]) => label),
  );
}
