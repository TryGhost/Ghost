import {FILTER_TYPES} from './filter-registry';
import {filterNamesKey} from './filter-query-core';
import {columnAddressing, composeCodec} from './filter-addressing';
import type {FieldAddressing, PlainAddressing, PresenceAddressing} from './filter-addressing';
import type {ConfigOf, FilterTypeFacts, FilterTypeId} from './filter-registry';
import type {FilterField} from './filter-types';
import type {ValueSemantics} from './semantics';
import type {PresenceOperator} from './filter-operators';

export type FieldIcon =
    | 'arrows' | 'calendar' | 'calendar-clock' | 'calendar-end' | 'calendar-start' | 'card'
    | 'circle' | 'click' | 'eye' | 'file-text' | 'flag' | 'layers' | 'mail' | 'mail-open'
    | 'message' | 'message-text' | 'newspaper' | 'percent' | 'person' | 'person-circle'
    | 'person-plus' | 'send' | 'tag' | 'ticket' | 'text';

interface FieldDescriptorBase {
    key: string;
    icon: FieldIcon;
    addressing?: FieldAddressing;
    ui: Omit<FilterField['ui'], 'type'> & {type?: FilterField['ui']['type']};
    options?: FilterField['options'];
    metadata?: FilterField['metadata'];
    parseKeys?: readonly string[];
}

type WritableBy<TType extends FilterTypeId> =
    ReturnType<typeof FILTER_TYPES[TType]['semantics']>['operators'][number];

type TypeSpecific<TType extends FilterTypeId> = {
    type: TType;
    valueConfig?: ConfigOf<TType>;
};

type TypedFieldDescriptor = {
    [TType in FilterTypeId]:
        | (FieldDescriptorBase & TypeSpecific<TType> & {
            addressing?: PlainAddressing;
            operators?: readonly WritableBy<TType>[];
        })
        | (FieldDescriptorBase & TypeSpecific<TType> & {
            addressing: PresenceAddressing;
            operators?: readonly (WritableBy<TType> | PresenceOperator)[];
        })
}[FilterTypeId];

// This looks like an unused symbol and a pointless cast in `domainField()` below. Deleting
// either one silently removes a check.
//
// Nothing ever sets this property at runtime. It exists so that a plain object can never be a
// DomainFieldDescriptor, which forces every one of them through `domainField()` — the only
// place that compares a field's operators against the vocabulary that has to write them. Take
// it away and a field can list an operator its vocabulary cannot express: it compiles, no test
// fails, and the operator just quietly goes missing from the filter menu.
declare const CHECKED_AGAINST_ITS_VOCABULARY: unique symbol;

export interface DomainFieldDescriptor<TOperator extends string = string> extends FieldDescriptorBase {
    type?: undefined;
    valueConfig?: undefined;
    semantics: ValueSemantics<TOperator>;
    operators?: readonly (TOperator | PresenceOperator)[];
    readonly [CHECKED_AGAINST_ITS_VOCABULARY]: true;
}

type DomainFieldCommon<TKey extends string, TOperator extends string> = {
    key: TKey;
    icon: FieldIcon;
    semantics: ValueSemantics<TOperator>;
    ui: FieldDescriptorBase['ui'];
    options?: FieldDescriptorBase['options'];
    metadata?: FieldDescriptorBase['metadata'];
    parseKeys?: readonly string[];
};

export function domainField<const TKey extends string, TOperator extends string>(descriptor:
    | (DomainFieldCommon<TKey, TOperator> & {
        addressing?: PlainAddressing;
        operators?: readonly NoInfer<TOperator>[];
    })
    | (DomainFieldCommon<TKey, TOperator> & {
        addressing: PresenceAddressing;
        operators?: readonly (NoInfer<TOperator> | PresenceOperator)[];
    })
): DomainFieldDescriptor<TOperator> & {key: TKey} {
    return descriptor as DomainFieldDescriptor<TOperator> & {key: TKey};
}

export type FieldDescriptor =
    | TypedFieldDescriptor
    | DomainFieldDescriptor<string>;

// Every type is handed its config, whether or not it currently takes one, so a type that grows
// a config parameter later starts receiving it rather than quietly ignoring it. The cast is
// needed only because TypeScript cannot see that `type` and `valueConfig` were checked against
// each other where the field was declared; it can't tell them apart once they arrive here as a
// union.
type SemanticsFactory = (config?: unknown) => ValueSemantics<string>;

function semanticsFor(descriptor: FieldDescriptor) {
    if (descriptor.type === undefined) {
        return descriptor.semantics;
    }

    return (FILTER_TYPES[descriptor.type].semantics as SemanticsFactory)(descriptor.valueConfig);
}

export function describeField(descriptor: FieldDescriptor): FilterField {
    const addressing = descriptor.addressing ?? columnAddressing();
    const registered: FilterTypeFacts | undefined = descriptor.type ? FILTER_TYPES[descriptor.type] : undefined;
    const semantics = semanticsFor(descriptor);
    const presenceOperators = addressing.presenceOperators ?? [];
    const encodable: readonly string[] = [...semantics.operators, ...presenceOperators];
    const offered = [...(registered?.operators ?? semantics.operators), ...presenceOperators];
    const chosen = descriptor.operators?.filter(operator => encodable.includes(operator)) ?? offered;

    const ui: FilterField['ui'] = {
        ...descriptor.ui,
        icon: descriptor.icon,
        label: String(descriptor.ui.label),
        type: descriptor.ui.type ?? registered?.control ?? 'text'
    };

    if (ui.defaultOperator === undefined && registered?.defaultOperator) {
        ui.defaultOperator = registered.defaultOperator;
    }

    return {
        operators: chosen satisfies readonly string[],
        codec: composeCodec(addressing, semantics),
        ...(registered?.labels ? {operatorLabels: registered.labels} : {}),
        ...(descriptor.options ? {options: descriptor.options} : {}),
        ...(descriptor.metadata ? {metadata: descriptor.metadata} : {}),
        ...(descriptor.parseKeys ? {parseKeys: descriptor.parseKeys} : {}),
        ui
    };
}

export function buildCatalog(descriptors: readonly FieldDescriptor[]): Record<string, FilterField> {
    const catalog: Record<string, FilterField> = {};

    for (const descriptor of descriptors) {
        catalog[descriptor.key] = describeField(descriptor);
    }

    return catalog;
}

export interface FieldProvider {
    resolved: boolean;
    claims?: readonly string[];
    fields: readonly FieldDescriptor[];
}

export function buildProvidedCatalog(providers: readonly FieldProvider[]): Record<string, FilterField> {
    return buildCatalog(providers.flatMap(provider => provider.fields));
}

export function catalogCanRead(filter: string | undefined, providers: readonly FieldProvider[]): boolean {
    if (!filter) {
        return true;
    }

    return providers.every(provider => provider.resolved
        || !(provider.claims ?? []).some(claim => filterNamesKey(filter, claim)));
}
