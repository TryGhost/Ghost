import { useEffect, useState } from 'react';

// Yield between bounded backend requests. Long scans pause for an explicit
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
    const timer = setTimeout(loadMore, 250);
    return () => clearTimeout(timer);
  }, [enabled, scanning, fetching, failed, paused, loadMore, pages]);
  return { paused, continueSearch: () => setAllowance({ requestId, until: pages + 8 }) };
};
