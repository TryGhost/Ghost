// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// A high-level log of the design changes made on this branch, newest first,
// shown on the patterns page. One entry per change someone would review; the
// points say what changed and where, not how.

export interface PrototypeChange {
  date: string;
  title: string;
  points: string[];
}

export const CHANGES: PrototypeChange[] = [
  {
    date: '26 Oct 2026',
    title: 'Data scenarios (prototype tooling)',
    points: [
      'Prototype menu → Data: No data yet, Small, Mid-sized or Large publisher, or the site’s own data.',
      'Drives this page and the real Analytics screens alike, including post analytics for the sample posts.',
      'No Tinybird needed: web traffic, members, MRR and newsletters are all faked in the browser.',
      'Tooling only; nothing here ships.',
    ],
  },
  {
    date: '26 Oct 2026',
    title: 'Flat chart colours',
    points: [
      'Area charts: a flat 10% fill instead of a fading gradient. Changed in Shade, so every area chart in Admin follows.',
      'Bars (Newsletters, Paid subscriptions): a flat 50% fill; hover still shows the full colour.',
      'Donut (Growth, Paid subscription breakdown): flat slices at 70%. Not on this page yet; see Growth.',
      'Rings (post Newsletter): solid colour at 80%.',
      'Opacities roughly match the old gradients’ average, so the weight of each chart stays about the same.',
    ],
  },
];
