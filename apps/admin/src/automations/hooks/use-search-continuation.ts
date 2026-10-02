import { useEffect, useState } from 'react';

// Continue as soon as the previous request finishes. Long scans pause for an explicit
// continuation instead of silently walking arbitrarily large histories.
export const useSearchContinuation = ({
  requestId,
  pages,
  scanning,
  enabled,
  fetching,
  failed,
  loadMore,
}: {
  requestId: string;
  pages: number;
  scanning: boolean;
  enabled: boolean;
  fetching: boolean;
  failed: boolean;
  loadMore: () => void;
}) => {
  const [allowance, setAllowance] = useState({ requestId, until: 8 });
  const until = allowance.requestId === requestId ? allowance.until : 8;
  const paused = scanning && pages >= until;
  useEffect(() => {
    if (!enabled || !scanning || fetching || failed || paused) {
      return;
    }
    loadMore();
  }, [enabled, scanning, fetching, failed, paused, loadMore, pages]);
  return { paused, continueSearch: () => setAllowance({ requestId, until: pages + 8 }) };
};
