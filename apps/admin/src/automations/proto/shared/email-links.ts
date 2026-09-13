// Clicked-link rows for an email step.
//
// The shipped sidebar fetches these (useBrowseAutomationActionLinks, added in
// #29639); that hook and its AutomationActionLink type don't exist on this
// branch, and the proto has no backend anyway — so rows are generated here in
// the same shape the API returns, and the rendering is ported verbatim.
//
// Deterministic on the action id (same trick the run rows use in float/panels)
// so a given email always shows the same links, in the same order, across
// renders and reloads.

export interface ProtoActionLink {
  url: string;
  clicked_count: number;
}

const LINK_FIXTURES = [
  'https://sure-footed-chapel.org/broken-spirit',
  'https://major-publicity.org/french-carboxyl',
  'https://simple-strait.info/made-up-innovation',
  'https://trivial-yarmulke.com/sudden-labourer',
  'https://ringed-doorbell.io/articles/quarterly-review',
  'https://gentle-banyan.dev/changelog#2026-08',
  'https://wistful-harbour.net/guides/getting-started',
  'https://plucky-lantern.co/offers/annual-plan',
  'https://candid-meadow.org/archive/issue-42',
  'https://brisk-anvil.io/community/introductions',
];

// Share of an email's clicks each row takes, biggest first. Sums to ~0.9, so the
// listed links account for most but not all clicks — the same shape real data
// has once you truncate to the top 10.
const WEIGHTS = [0.19, 0.18, 0.17, 0.16, 0.12, 0.08];

const seedOf = (actionId: string): number =>
  [...actionId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

export const actionLinks = (actionId: string, clickedCount: number): ProtoActionLink[] => {
  if (clickedCount <= 0) {
    return [];
  }
  const seed = seedOf(actionId);
  return WEIGHTS.map((weight, i) => ({
    // Rotate the fixture window by the seed so different emails list
    // different links rather than all showing the same six.
    url: LINK_FIXTURES[(seed + i) % LINK_FIXTURES.length],
    // Deterministic per-row wobble, so the counts don't read as a formula.
    clicked_count: Math.max(
      1,
      Math.round(clickedCount * weight * (1 - ((seed + i * 7) % 11) / 100)),
    ),
  })).sort((a, b) => b.clicked_count - a.clicked_count);
};
