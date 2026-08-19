import {type MemberCustomField, type MemberCustomFieldCsvColumn} from '@tryghost/admin-x-framework/api/member-custom-fields';

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
    | (FieldFacts & {source: 'membership'})
    | (FieldFacts & {source: 'custom'; type: MemberCustomField['type']});

/**
 * One thing a CSV column can be imported as.
 *
 * `contested` belongs to the list rather than to the field: whether "Tier" needs telling apart
 * depends on whether tiers are on offer at all.
 */
export type FieldTarget = FieldOffer & {contested: boolean};

interface FieldSourcePresentation {
    heading: string;
    /** Null for the source a reader assumes. Exactly one source may be null. */
    badge: string | null;
    /** Named in full, for the accessible name; null to say nothing. */
    ariaKind: string | null;
}

export const FIELD_SOURCES: Record<FieldSource, FieldSourcePresentation> = {
    membership: {heading: 'Membership fields', badge: null, ariaKind: null},
    custom: {heading: 'Custom fields', badge: 'Custom', ariaKind: 'Custom field'}
};

export const FIELD_SOURCE_ORDER = Object.keys(FIELD_SOURCES) as FieldSource[];

/** Everything a column can be imported as, in the order the sections offer it. */
export function fieldTargets({membershipFields, customFieldColumns}: {
    membershipFields: {label: string; value: string}[];
    customFieldColumns: MemberCustomFieldCsvColumn[];
}): FieldTarget[] {
    const offers: FieldOffer[] = [
        ...membershipFields.map((field): FieldOffer => ({
            value: field.value,
            source: 'membership',
            fieldName: field.label,
            label: field.label
        })),
        ...customFieldColumns.map((column): FieldOffer => ({
            value: column.value,
            source: 'custom',
            fieldName: column.fieldName,
            ...(column.partLabel === undefined ? {} : {partLabel: column.partLabel}),
            label: column.label,
            type: column.type
        }))
    ];

    const contested = labelsSharedAcrossSources(offers);
    return offers.map(offer => ({...offer, contested: contested.has(readsAs(offer))}));
}

function readsAs(offer: {label: string}): string {
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
        [...sourcesByLabel].filter(([, sources]) => sources.size > 1).map(([label]) => label)
    );
}
