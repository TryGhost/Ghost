// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// The release plan for the Admin 7 analytics update: slices in the order they
// ship, so each lands without depending on anything still unshipped. A
// running list; shown at the bottom of the patterns page.
//
// Every slice ships behind the private `admin7Analytics` Labs flag, is
// dogfooded, then graduates by deleting the old path in the same PR.

export type SliceStatus = 'built' | 'on-hold' | 'to-do';

export interface ReleaseSlice {
  title: string;
  status: SliceStatus;
  // What changes, in a sentence
  summary: string;
  // Where people will see it
  reach: string;
  // Slices (by title) that must ship first, or with it
  dependsOn?: string[];
  // How it's built, and anything the PR still needs
  notes?: string[];
  // Prototype commits on zach-analytics-proto
  commits?: string[];
}

export const SLICES: ReleaseSlice[] = [
  {
    title: 'Analytics flag',
    status: 'built',
    summary:
      'A private Labs flag, admin7Analytics, that Admin turns into one attribute on the page root (data-admin7-analytics).',
    reach: 'Nothing visible on its own; every slice below reads it.',
    notes: [
      'Shade reads it with useRootFlag and the admin7-analytics: style variant.',
      'Prototype: the menu’s Admin 7 analytics switch stands in for the Labs flag.',
      'PR: register the Labs flag; agree useRootFlag with Zimo, since isAdmin7 now stays on for the shipped pill controls.',
    ],
    commits: ['98af0d1c1f', 'fd5a516ff6'],
  },
  {
    title: 'Flat, simpler charts',
    status: 'built',
    summary:
      'Area charts lose gridlines and get a smooth line, flat fill and dates in capitals; bars, donut and rings go flat.',
    reach:
      'Every area chart in Admin, including the automations editor; bars, donut and rings on Growth, Newsletters and post Newsletter.',
    dependsOn: ['Analytics flag'],
    notes: [
      'Area chart is a Shade change (GhAreaChart); value switches only, no structure.',
      'Bars, donut and rings are hand-built in Admin, so each file changes on its own.',
    ],
    commits: ['98af0d1c1f'],
  },
  {
    title: 'Metric labels and numbers',
    status: 'built',
    summary:
      'Labels in 12px small caps mono with no leading icon; numbers regular weight at 32px on cards and 28px in tabs.',
    reach: 'Every KPI card and metric tab, on site and post analytics.',
    dependsOn: ['Analytics flag'],
    notes: [
      'Pure CSS in Shade (MetricValue, KpiCardHeaderLabel): no code branches.',
      'Ship with the stat card, or before it, so Overview and the tabs match.',
    ],
    commits: ['fd5a516ff6', 'd1cae77814'],
  },
  {
    title: 'Overview stat cards',
    status: 'built',
    summary: 'Open columns instead of cards, with a rule between the number and the chart.',
    reach: 'Overview only.',
    dependsOn: ['Flat, simpler charts', 'Metric labels and numbers'],
    notes: [
      'A new card beside today’s, one switch between them; the trend badge and View more stay.',
    ],
    commits: ['d1cae77814'],
  },
  {
    title: 'Overview chart colours',
    status: 'on-hold',
    summary: 'Each stat card’s line in a colour of its own, from existing Shade chart tokens.',
    reach: 'Overview only.',
    dependsOn: ['Overview stat cards'],
    notes: ['On hold until Zach has talked to Zimo about colour.'],
  },
];

// Not sequenced yet: changes to weigh up, decisions to make, and work the
// PRs need. Move an item into SLICES once it's decided.
export const TO_CONSIDER: string[] = [
  'Coloured dots before labels on the metric tabs and post cards; the designs have none.',
  'Trend badges on the stat cards: keep or remove (Zimo).',
  'Big numbers in sans (today) or mono (the Ghost-wide rule)?',
  'Shade bar and donut chart patterns, so those charts are styled in one place.',
  'From the brief: inline subviews, the recent posts list, the latest post card and the banner.',
  'Web traffic, Growth, Newsletters and post analytics beyond the shared pieces.',
  'Every PR: Storybook stories and docs for changed Shade components, and a visual check with the flag on and off.',
  'Graduation: remove the flag, the classic stat card and the old values.',
];
