export type EntryStatsWindow = {
  date_from: string;
  date_to: string;
  bucket: 'day';
  timezone: 'UTC';
};

export type EntryStatsData = {
  total_run_count: number;
  entries: { date: string; count: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Include the complete recorded history through today. Empty histories show today's zero.
export function getEntryStatsWindow(
  entries: EntryStatsData['entries'],
  now = new Date(),
): EntryStatsWindow {
  const today = now.toISOString().slice(0, 10);
  const dates = entries.map((entry) => entry.date).sort();
  const start = dates[0] ?? today;
  const latest = dates.at(-1) ?? today;
  const end = latest > today ? latest : today;
  return {
    date_from: start,
    date_to: new Date(Date.parse(end) + DAY_MS).toISOString().slice(0, 10),
    bucket: 'day',
    timezone: 'UTC',
  };
}

export function fillEntryStats(data: EntryStatsData, window: EntryStatsWindow): EntryStatsData {
  const counts = new Map(data.entries.map((entry) => [entry.date, entry.count]));
  const entries = [];
  for (let day = Date.parse(window.date_from); day < Date.parse(window.date_to); day += DAY_MS) {
    const date = new Date(day).toISOString().slice(0, 10);
    entries.push({ date, count: counts.get(date) ?? 0 });
  }
  return { total_run_count: data.total_run_count, entries };
}
