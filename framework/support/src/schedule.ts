/**
 * A cron expression for once a day, at a random time between midnight and 6am.
 *
 * Random so that the job does not run at the same instant on every installation.
 */
export function dailyOffPeak(): string {
  const second = Math.floor(Math.random() * 60);
  const minute = Math.floor(Math.random() * 60);
  const hour = Math.floor(Math.random() * 6);
  return `${second} ${minute} ${hour} * * *`;
}
