import type {
  Filter,
  FilterFieldConfig,
  FilterGroup,
  FilterI18nConfig,
  FilterOperator,
} from '@/components/patterns/filters';

// Default English i18n configuration
export const DEFAULT_I18N: FilterI18nConfig = {
  // UI Labels
  addFilter: '',
  clearFilters: 'Clear',
  searchFields: 'Search fields...',
  noFieldsFound: 'No fields found.',
  noResultsFound: 'No results found.',
  loading: 'Loading...',
  loadMore: 'Load more',
  showMore: (count) => `Show ${count} more`,
  select: 'Select...',
  true: 'True',
  false: 'False',
  min: 'Min',
  max: 'Max',
  to: 'to',
  typeAndPressEnter: 'Type and press Enter to add tag',
  selected: 'selected',
  selectedCount: 'selected',
  percent: '%',
  defaultCurrency: '$',
  defaultColor: 'currentColor',
  addFilterTitle: '',

  // Operators
  operators: {
    is: 'is',
    isNot: 'is not',
    isAnyOf: 'is any of',
    isNotAnyOf: 'is not any of',
    includesAll: 'includes all',
    excludesAll: 'excludes all',
    before: 'before',
    after: 'after',
    between: 'between',
    notBetween: 'not between',
    contains: 'contains',
    notContains: 'does not contain',
    startsWith: 'starts with',
    endsWith: 'ends with',
    isExactly: 'is exactly',
    equals: 'equals',
    notEquals: 'not equals',
    greaterThan: 'greater than',
    lessThan: 'less than',
    overlaps: 'overlaps',
    includes: 'includes',
    excludes: 'excludes',
    includesAllOf: 'includes all of',
    includesAnyOf: 'includes any of',
    empty: 'is empty',
    notEmpty: 'is not empty',
  },

  // Placeholders
  placeholders: {
    enterField: (fieldType: string) => `Enter ${fieldType}...`,
    selectField: 'Select...',
    searchField: (fieldName: string) => `Search ${fieldName.toLowerCase()}...`,
    enterKey: 'Enter key...',
    enterValue: 'Enter value...',
  },

  // Helper functions
  helpers: {
    formatOperator: (operator: string) => operator.replace(/_/g, ' '),
  },

  // Validation
  validation: {
    invalidEmail: 'Invalid email format',
    invalidUrl: 'Invalid URL format',
    invalidTel: 'Invalid phone format',
    invalid: 'Invalid input format',
  },
};

// Helper function to create operators from i18n config
export const createOperatorsFromI18n = (
  i18n: FilterI18nConfig,
): Record<string, FilterOperator[]> => ({
  select: [
    { value: 'is', label: i18n.operators.is },
    { value: 'is_not', label: i18n.operators.isNot },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  multiselect: [
    { value: 'is_any_of', label: i18n.operators.isAnyOf },
    { value: 'is_not_any_of', label: i18n.operators.isNotAnyOf },
    { value: 'includes_all', label: i18n.operators.includesAll },
    { value: 'excludes_all', label: i18n.operators.excludesAll },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  date: [
    { value: 'before', label: i18n.operators.before },
    { value: 'after', label: i18n.operators.after },
    { value: 'is', label: i18n.operators.is },
    { value: 'is_not', label: i18n.operators.isNot },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  daterange: [
    { value: 'between', label: i18n.operators.between },
    { value: 'not_between', label: i18n.operators.notBetween },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  text: [
    { value: 'contains', label: i18n.operators.contains },
    { value: 'not_contains', label: i18n.operators.notContains },
    { value: 'starts_with', label: i18n.operators.startsWith },
    { value: 'ends_with', label: i18n.operators.endsWith },
    { value: 'is', label: i18n.operators.isExactly },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  number: [
    { value: 'equals', label: i18n.operators.equals },
    { value: 'not_equals', label: i18n.operators.notEquals },
    { value: 'greater_than', label: i18n.operators.greaterThan },
    { value: 'less_than', label: i18n.operators.lessThan },
    { value: 'between', label: i18n.operators.between },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  numberrange: [
    { value: 'between', label: i18n.operators.between },
    { value: 'overlaps', label: i18n.operators.overlaps },
    { value: 'contains', label: i18n.operators.contains },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  boolean: [
    { value: 'is', label: i18n.operators.is },
    { value: 'is_not', label: i18n.operators.isNot },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  email: [
    { value: 'contains', label: i18n.operators.contains },
    { value: 'not_contains', label: i18n.operators.notContains },
    { value: 'starts_with', label: i18n.operators.startsWith },
    { value: 'ends_with', label: i18n.operators.endsWith },
    { value: 'is', label: i18n.operators.isExactly },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  url: [
    { value: 'contains', label: i18n.operators.contains },
    { value: 'not_contains', label: i18n.operators.notContains },
    { value: 'starts_with', label: i18n.operators.startsWith },
    { value: 'ends_with', label: i18n.operators.endsWith },
    { value: 'is', label: i18n.operators.isExactly },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  tel: [
    { value: 'contains', label: i18n.operators.contains },
    { value: 'not_contains', label: i18n.operators.notContains },
    { value: 'starts_with', label: i18n.operators.startsWith },
    { value: 'ends_with', label: i18n.operators.endsWith },
    { value: 'is', label: i18n.operators.isExactly },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  time: [
    { value: 'before', label: i18n.operators.before },
    { value: 'after', label: i18n.operators.after },
    { value: 'is', label: i18n.operators.is },
    { value: 'between', label: i18n.operators.between },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  datetime: [
    { value: 'before', label: i18n.operators.before },
    { value: 'after', label: i18n.operators.after },
    { value: 'is', label: i18n.operators.is },
    { value: 'between', label: i18n.operators.between },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
});

// Default operators for different field types (using default i18n)
export const DEFAULT_OPERATORS: Record<string, FilterOperator[]> =
  createOperatorsFromI18n(DEFAULT_I18N);

export const createFilter = <T = unknown>(
  field: string,
  operator?: string,
  values: T[] = [],
): Filter<T> => ({
  id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  field,
  operator: operator || 'is',
  values,
});

export const createFilterGroup = <T = unknown>(
  id: string,
  label: string,
  fields: FilterFieldConfig<T>[],
  initialFilters: Filter<T>[] = [],
): FilterGroup<T> => ({
  id,
  label,
  filters: initialFilters,
  fields,
});
