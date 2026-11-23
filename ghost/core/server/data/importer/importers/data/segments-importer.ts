import type { Knex } from 'knex';
import { z } from 'zod';
import segments from '../../../../services/segments';
import { MAX_NAME_LENGTH, SegmentFilter, SegmentName } from '../../../../services/segments/models';
import {
  isFilterTakenError,
  isNameTakenError,
  normalizeName,
} from '../../../../services/segments/rejections';
import {
  type ExportedSegment,
  SavedMemberView,
  savedViewsIn,
  segmentKey,
  segmentsInRows,
} from '../../../../services/segments/saved-member-views';

// Imports a site's segments, which Admin shows as saved member views.
//
// An export holds them in two places. An export from a version that stores segments in a table
// of their own has them as rows under `segments`, and again as entries of the `shared_views`
// setting, beside the posts list's saved views, for older versions to import. An older export
// has them in the setting alone. A segment is read once, from the rows when both places hold
// it, and added through the segments service, so an imported segment follows the rules any new
// segment does.

const ExportedSetting = z.object({ key: z.string(), value: z.unknown() });

const ExportData = z.object({
  segments: z.array(z.unknown()).catch([]),
  settings: z.array(z.unknown()).catch([]),
});

/**
 * A `shared_views` value without its saved member views, which are imported as segments. A
 * value that holds none, or that can't be read as views, is returned as it is.
 */
export function withoutSavedMemberViews(value: unknown): unknown {
  const entries = savedViewsIn(value) ?? [];
  const kept = entries.filter((entry) => !SavedMemberView.safeParse(entry).success);
  return kept.length === entries.length ? value : JSON.stringify(kept);
}

/**
 * The segments in an export file's data, in their order: its rows, then the saved member views
 * that aren't a row's copy in the setting.
 */
function exportedSegments(allDataFromFile: unknown): ExportedSegment[] {
  const data = ExportData.safeParse(allDataFromFile);
  if (!data.success) {
    return [];
  }
  const rows = segmentsInRows(data.data.segments);
  const inRows = new Set(rows.map(segmentKey));
  const views = data.data.settings
    .flatMap((setting) => ExportedSetting.safeParse(setting).data ?? [])
    .filter(({ key }) => key === 'shared_views')
    .flatMap(({ value }) => savedViewsIn(value) ?? [])
    .flatMap((entry) => SavedMemberView.safeParse(entry).data ?? [])
    .filter((view) => !inRows.has(segmentKey(view)));
  return [...rows, ...views];
}

/**
 * The name a segment is imported under: `name` itself for the number 1, and otherwise `name` with
 * the number added, such as "VIP (2)". Either is cut to be no longer than a segment's name can be.
 */
function numbered(name: string, number: number): string {
  const suffix = number === 1 ? '' : ` (${number})`;
  return [...name.trim()].slice(0, MAX_NAME_LENGTH - suffix.length).join('') + suffix;
}

interface ImportProblem {
  message: string;
  help: string;
  context: string;
}

/**
 * The step of a data import that adds the file's segments. It has the shape the data importer
 * drives every step through.
 */
export class SegmentsImporter {
  readonly dataKeyToImport = 'segments';
  readonly options = { requiredImportedData: [], requiredExistingData: [] };
  readonly requiredImportedData = {};
  readonly requiredExistingData = {};
  readonly problems: ImportProblem[] = [];
  readonly errors: unknown[] = [];
  readonly importedData: ExportedSegment[] = [];
  readonly importedDataToReturn: ExportedSegment[] = [];

  private readonly toImport: ExportedSegment[];

  constructor(allDataFromFile: unknown) {
    this.toImport = exportedSegments(allDataFromFile);
  }

  async fetchExisting(): Promise<void> {}

  async beforeImport(): Promise<void> {}

  async replaceIdentifiers(): Promise<void> {}

  /**
   * Adds each segment in the file, in the file's order and in the import's transaction.
   *
   * A segment the site already has is not added again, so a file can be imported twice: the
   * site has it when a segment has its filter under its name, or under its name with a number,
   * which is how an import stores a segment whose name was taken. A segment that can't be one,
   * such as one with an empty name, is left out. A segment whose name is taken by a segment
   * with another filter is added with a number, such as "VIP (2)", because nobody can be asked
   * for another name during an import. Every segment whose own name is free keeps it, so a
   * segment only gets a number when the site, or an earlier segment in the file, has its name.
   */
  async doImport({ transacting }: { transacting: Knex.Transaction }): Promise<void> {
    if (this.toImport.length === 0) {
      return;
    }
    const { service } = segments;
    const stored = await service.browse(transacting);
    const taken = new Set(stored.map(({ name }) => normalizeName(name)));

    // The names the site's segments have, by filter, and then those of the file's segments too.
    const namesOf = new Map<string, Set<string>>();
    const hold = (name: string, filter: string) =>
      namesOf.set(filter, (namesOf.get(filter) ?? new Set()).add(normalizeName(name)));
    for (const { name, filter } of stored) {
      hold(name, filter);
    }
    // No name is given a higher number than this, as there are no more segments to clash with.
    const highestNumber = stored.length + this.toImport.length + 1;
    /**
     * Whether a segment has `filter` under `name`, or under `name` with a number, which is how
     * an earlier import or the migration stored a segment whose name was taken.
     */
    const isHeld = (name: string, filter: string): boolean => {
      const names = namesOf.get(filter);
      if (!names) {
        return false;
      }
      for (let number = 1; number <= highestNumber; number += 1) {
        if (names.has(normalizeName(numbered(name, number)))) {
          return true;
        }
      }
      return false;
    };

    const wanted: { segment: ExportedSegment; filter: SegmentFilter; number?: number }[] = [];
    for (const segment of this.toImport) {
      const filter = SegmentFilter.safeParse(segment.filter);
      if (!filter.success || !SegmentName.safeParse(numbered(segment.name, 1)).success) {
        this.skipped(segment, 'Segment was not imported because its name or filter is invalid.');
      } else if (isHeld(segment.name, filter.data)) {
        this.skipped(segment, 'Segment was not imported because the site already has it.');
      } else {
        hold(numbered(segment.name, 1), filter.data);
        wanted.push({ segment, filter: filter.data });
      }
    }

    /** The first number from `from` that gives `name` a name nothing has taken, which it takes. */
    const take = (name: string, from: number): number => {
      let number = from;
      while (taken.has(normalizeName(numbered(name, number)))) {
        number += 1;
      }
      taken.add(normalizeName(numbered(name, number)));
      return number;
    };
    for (const entry of wanted) {
      if (!taken.has(normalizeName(numbered(entry.segment.name, 1)))) {
        entry.number = take(entry.segment.name, 1);
      }
    }
    for (const entry of wanted) {
      entry.number ??= take(entry.segment.name, 2);
    }

    // Each rejected name leads to one the service has free, and the database can only count
    // it as taken by a segment that is stored, so one more try than there are segments is enough.
    const tries = stored.length + wanted.length + 1;
    for (const { segment, filter, number } of wanted) {
      await this.add(segment, filter, { number: number ?? 1, tries, take }, transacting);
    }
  }

  /**
   * Adds `segment` under its name with `names.number`. The service compares names as `take`
   * does, but the database can count a name as another segment's where that comparison
   * doesn't, as MySQL's default collation does for "Cafe" and "Café". The segment is then tried
   * with the next free number, up to `names.tries` times. A rejected add has written nothing, so
   * the import goes on.
   */
  private async add(
    segment: ExportedSegment,
    filter: SegmentFilter,
    names: { number: number; tries: number; take: (name: string, from: number) => number },
    transacting: Knex.Transaction,
  ): Promise<void> {
    let { number } = names;
    for (let tried = 0; tried < names.tries; tried += 1) {
      const name = SegmentName.parse(numbered(segment.name, number));
      try {
        const added = await segments.service.add({ actor: null }, { name, filter }, transacting);
        this.importedData.push(added);
        this.importedDataToReturn.push(added);
        return;
      } catch (err) {
        if (isFilterTakenError(err)) {
          break;
        }
        if (!isNameTakenError(err)) {
          throw err;
        }
        number = names.take(segment.name, number + 1);
      }
    }
    this.skipped(segment, 'Segment was not imported because the site already has it.');
  }

  private skipped(segment: ExportedSegment, message: string): void {
    this.problems.push({ message, help: 'Segment', context: JSON.stringify(segment) });
  }
}
