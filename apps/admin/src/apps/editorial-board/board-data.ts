// Stub content for the mocked Editorial board. Nothing here is fetched.

export type BoardStage = 'idea' | 'drafting' | 'review' | 'editing' | 'revision' | 'ready';

export interface BoardColumn {
  id: BoardStage;
  label: string;
  /** Each stage has its own colour, used for the column tint and marker. */
  color: string;
}

export const BOARD_COLUMNS: BoardColumn[] = [
  { id: 'idea', label: 'Idea', color: '#E0457B' },
  { id: 'drafting', label: 'Drafting', color: '#F0A202' },
  { id: 'review', label: 'Ready for review', color: '#2B8DE8' },
  { id: 'editing', label: 'Editing', color: '#6B3FA0' },
  { id: 'revision', label: 'Revision requested', color: '#E45B2C' },
  { id: 'ready', label: 'Ready to schedule', color: '#1D9E75' },
];

export interface BoardItem {
  id: string;
  title: string;
  stage: BoardStage;
  assignee: string | null;
  /** Target date (YYYY-MM-DD). */
  date: string;
  /** Items owned by Ghost carry a feature image. */
  hasImage: boolean;
}

export const BOARD_ITEMS: BoardItem[] = [
  {
    id: '1',
    title: 'The council piece: what changed after the vote',
    stage: 'idea',
    assignee: null,
    date: '2026-09-25',
    hasImage: false,
  },
  {
    id: '2',
    title: 'Interview: the new head of the library',
    stage: 'idea',
    assignee: 'Sam',
    date: '2026-10-02',
    hasImage: false,
  },
  {
    id: '3',
    title: 'Why the river path floods every autumn',
    stage: 'drafting',
    assignee: 'Priya',
    date: '2026-09-24',
    hasImage: true,
  },
  {
    id: '4',
    title: 'Weekly digest for Friday, September 26',
    stage: 'drafting',
    assignee: null,
    date: '2026-09-26',
    hasImage: false,
  },
  {
    id: '5',
    title: 'Photo essay: last light on the pier',
    stage: 'review',
    assignee: 'Priya',
    date: '2026-09-24',
    hasImage: true,
  },
  {
    id: '6',
    title: 'What the budget means for the leisure centre',
    stage: 'editing',
    assignee: 'Jamie',
    date: '2026-09-23',
    hasImage: true,
  },
  {
    id: '7',
    title: 'Opinion: the case for a car-free high street',
    stage: 'revision',
    assignee: 'Alex',
    date: '2026-09-29',
    hasImage: true,
  },
  {
    id: '8',
    title: 'Guide: the best autumn walks nearby',
    stage: 'ready',
    assignee: null,
    date: '2026-10-01',
    hasImage: true,
  },
];
