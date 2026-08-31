import type { Knex } from 'knex';

export interface DateRangeOptions {
  date_from?: string;
  date_to?: string;
  timezone?: string;
}

export interface DateBoundaryRange {
  dateFrom: string | null;
  dateTo: string | null;
}

export function getDateBoundaries(options: DateRangeOptions): DateBoundaryRange;
export function getPreviousDateBoundaries(options: DateRangeOptions): DateBoundaryRange | null;
export function applyDateFilter(
  query: Knex.QueryBuilder,
  dateFrom: string | null,
  dateTo: string | null,
  dateColumn: string,
): void;
export function validateDateRangeOptions(options: DateRangeOptions): void;
