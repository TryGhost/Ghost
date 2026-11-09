Copies of ghost-docker's upgrade supervisor protocol fixtures
(`manager/test/fixtures/upgrade-supervisor/` in TryGhost/ghost-docker), at
protocol 1. `valid/` must parse and `invalid/` must be refused. Change them only
together with ghost-docker's `docs/upgrade-supervisor.md`.

The prefix names the body: `request` (POST /v1/requests), `status`
(GET /v1/status), `job` (a job), `lookup` (a job the host no longer keeps),
`handshake` (GET /v1) and `error` (any error response).
