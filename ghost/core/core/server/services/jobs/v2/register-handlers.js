/**
 * The single boot step that registers every v2 job handler — this file is
 * the place to read "what jobs exist". One registration per job type: the
 * job class is pure data, and the handler closes over the services it needs.
 *
 * Runs at the end of initServices, once per boot (a re-boot re-registers
 * everything on a clean slate — see JobsService.init), so every service a
 * handler closes over has been initialised.
 */
function registerJobHandlers() {
    // Handlers are registered here as their call sites migrate from the
    // legacy @tryghost/job-manager to the v2 jobs service.
}

module.exports = {registerJobHandlers};
