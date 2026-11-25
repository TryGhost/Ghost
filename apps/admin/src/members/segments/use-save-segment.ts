import { type Segment, useAddSegment } from '@tryghost/admin-x-framework/api/segments';
import { useState } from 'react';
import { useSegmentPins } from './poc-store';
import { segmentWriteFailure } from './segment-write-failure';

/**
 * The state of a segment being made: its name, whether it will be pinned, and the save. Shared
 * by every place that makes one, so they refuse and report the same way.
 */
export function useSaveSegment(onCreated?: (segment: Segment) => void) {
  const [name, setName] = useState('');
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState('');
  const { mutateAsync: addSegment, isPending } = useAddSegment();
  const { setPinned: storePinned } = useSegmentPins();

  const canSave = (filter: string | undefined) => Boolean(name.trim() && filter) && !isPending;

  /** Saves the segment. Resolves to whether it was saved. */
  const save = async (filter: string | undefined): Promise<boolean> => {
    if (!filter || !canSave(filter)) {
      return false;
    }
    try {
      const { segments } = await addSegment({ name: name.trim(), filter });
      const [segment] = segments;
      if (segment && pinned) {
        storePinned(segment.id, true);
      }
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
    pinned,
    setPinned,
    error,
    isPending,
    canSave,
    save,
  };
}
