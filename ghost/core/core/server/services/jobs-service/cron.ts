// A cron for every five minutes at a random second and minute offset, so
// recurring jobs on many sites do not all fire at the same moment.
export function randomFiveMinuteCron(random: () => number = Math.random): string {
  // Use a random seconds value to avoid spikes to external APIs on the minute.
  const seconds = Math.floor(random() * 60); // 0-59
  // Run every 5 minutes, on 1,6,11..., 2,7,12..., 3,8,13..., etc.
  const minutes = Math.floor(random() * 5); // 0-4

  return `${seconds} ${minutes}/5 * * * *`;
}
