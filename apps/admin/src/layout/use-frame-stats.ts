export interface FrameStats {
  /** Visitors on the site right now */
  online: number;
  members: number;
  /** Monthly recurring revenue, in the currency's minor unit (e.g. cents) */
  mrr: number;
  currency: string;
}

// MOCK: fixed numbers while the frame's visuals are refined. Wiring them to
// real data (members, MRR, and visitors from Tinybird) is DES-1555; the top
// bar only reads what this returns.
const MOCK_FRAME_STATS: FrameStats = {
  online: 27,
  members: 874,
  mrr: 127600,
  currency: 'USD',
};

/** The site's at-a-glance numbers shown in the frame's top bar. */
export function useFrameStats(): FrameStats {
  return MOCK_FRAME_STATS;
}
