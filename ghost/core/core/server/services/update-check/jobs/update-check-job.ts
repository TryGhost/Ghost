/** Daily: pings the update service. Runs in-process, so no worker re-init of services. */
export default class UpdateCheckJob {
    static type = 'update-check';
}
