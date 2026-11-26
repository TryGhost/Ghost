import { type Segment, useAddSegment } from '@tryghost/admin-x-framework/api/segments';
import { useState } from 'react';
import { segmentWriteFailure } from './segment-write-failure';

export const NAME_MISSING = 'Enter a name for the segment';
const FILTERS_MISSING = 'Add a filter to choose who is in the segment';

/**
 * The state of a segment being made: its name and the save. Shared
 * by every place that makes one, so they refuse and report the same way.
 */
export function useSaveSegment(onCreated?: (segment: Segment) => void, initialName = '') {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  // Whether the last save found no filters to save. It stands until there are some.
  const [missedFilters, setMissedFilters] = useState(false);
  const { mutateAsync: addSegment, isPending } = useAddSegment();

  /**
   * Saves the segment. Resolves to whether it was saved. The save button is never disabled for
   * what is missing: as in Ghost's other forms, saving says what is wrong and the button offers
   * to retry.
   */
  const save = async (filter: string | undefined): Promise<boolean> => {
    if (isPending) {
      return false;
    }
    const missingName = !name.trim();
    setMissedFilters(!filter);
    if (missingName) {
      setError(NAME_MISSING);
    }
    if (missingName || !filter) {
      return false;
    }
    try {
      const { segments } = await addSegment({ name: name.trim(), filter });
      const [segment] = segments;
      if (segment) {
        onCreated?.(segment);
      }
      return true;
    } catch (err) {
      setError(segmentWriteFailure(err, 'add'));
      return false;
    }
  };

  return {
    name,
    setName: (next: string) => {
      setName(next);
      setError('');
    },
    error,
    /** What to say when the last save found no filters, or nothing once there are some. */
    filterError: (filter: string | undefined) => (missedFilters && !filter ? FILTERS_MISSING : ''),
    isPending,
    save,
  };
}
