import { buildProvidedCatalog, catalogCanRead } from '@/shared/filters';
import { customFieldProvider, type CustomFieldDefinition } from './custom-fields/filter-fields';
import { MEMBER_FIELD_DESCRIPTORS, memberFields } from './member-fields';
import { newsletterProvider, type NewsletterDefinition } from './newsletter-filter-fields';
import type { FieldProvider, FilterField } from '@/shared/filters';

export type MemberFields = Record<string, FilterField>;

export interface MemberCatalogSources {
  newsletters?: readonly NewsletterDefinition[];
  customFields?: readonly CustomFieldDefinition[];
}

export function memberFieldProviders({
  newsletters,
  customFields,
}: MemberCatalogSources = {}): FieldProvider[] {
  return [
    { resolved: true, fields: MEMBER_FIELD_DESCRIPTORS },
    newsletterProvider(newsletters),
    customFieldProvider(customFields),
  ];
}

export function buildMemberFields(sources: MemberCatalogSources = {}): MemberFields {
  if (!sources.newsletters && !sources.customFields) {
    return memberFields;
  }

  return buildProvidedCatalog(memberFieldProviders(sources));
}

export function canReadMemberFilter(
  filter: string | undefined,
  sources: MemberCatalogSources = {},
): boolean {
  return catalogCanRead(filter, memberFieldProviders(sources));
}
