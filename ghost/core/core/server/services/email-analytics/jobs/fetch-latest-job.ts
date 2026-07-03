/** Every 5 minutes: pulls the latest email events from the provider. Fetch cursors live in the jobs table. */
export default class EmailAnalyticsFetchLatestJob {
    static type = 'email-analytics-fetch-latest';
}
