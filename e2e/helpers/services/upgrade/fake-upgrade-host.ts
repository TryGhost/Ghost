import express from 'express';
import {
  type CreateUpgradeRequest,
  type ManualUpdate,
  type UpgradeDiagnostic,
  type UpgradeJob,
  type UpgradeState,
  type UpgradeStatus,
  createUpgradeRequestSchema,
  finalUpgradeStates,
  upgradeDiagnosticsSchema,
  upgradeErrorCodeSchema,
  upgradeJobIdSchema,
  upgradeJobResultSchema,
  upgradeJobSchema,
  upgradeStatusSchema,
} from '@tryghost/adapter-base-upgrade';
import { FakeServer } from '@/helpers/services/fake-server';
import { z } from 'zod';

// ghost-docker's docs/upgrade-supervisor.md, protocol 1.
export const PROTOCOL = 1;

// Transport failures the supervisor answers besides the base rejection codes.
const transportErrorCodes = ['malformed', 'not-found', 'method-not-allowed', 'too-large'] as const;
export type FakeUpgradeErrorCode =
  | z.infer<typeof upgradeErrorCodeSchema>
  | (typeof transportErrorCodes)[number];

/** Every body the fake sends, by kind. A body that fails its schema is never sent. */
export const responseSchemas = {
  handshake: z.object({ protocol: z.literal(PROTOCOL) }),
  status: upgradeStatusSchema,
  job: upgradeJobSchema,
  lookup: upgradeJobResultSchema,
  error: z.object({
    error: z.object({
      code: z.enum([...upgradeErrorCodeSchema.options, ...transportErrorCodes]),
      diagnostics: upgradeDiagnosticsSchema.optional(),
    }),
  }),
};
export type ResponseKind = keyof typeof responseSchemas;

export type UpgradeOutcome = (typeof finalUpgradeStates)[number];
export type HostAvailability = 'ready' | 'busy' | 'unavailable';

// The executor's stages, in ghost-docker's order, up to each final state.
const stagesFor: Record<UpgradeOutcome, UpgradeState[]> = {
  done: ['pending', 'pulling', 'backing-up', 'restarting', 'verifying', 'done'],
  restored: ['pending', 'pulling', 'backing-up', 'restoring', 'restored'],
  'needs-operator': [
    'pending',
    'pulling',
    'backing-up',
    'restarting',
    'restoring',
    'needs-operator',
  ],
  refused: ['pending', 'pulling', 'refused'],
  interrupted: ['pending', 'pulling', 'backing-up', 'interrupted'],
};

export const DEFAULT_MANUAL_UPDATES: ManualUpdate[] = [
  {
    component: 'stack',
    fromVersion: 'v1.4.0',
    toVersion: 'v1.5.0',
    reason: 'A stack update replaces the upgrade supervisor itself, so it runs on the host.',
    steps: ['In the site directory, run `./ghost-docker self-update`'],
  },
];

export interface FakeUpgradeHostSettings {
  currentVersion: string;
  /** Offered as the one-click Ghost update until the site reaches it. */
  targetVersion: string;
  /** The final state every accepted job ends in. */
  outcome: UpgradeOutcome;
  /** `busy` and `unavailable` stand for another operation or a problem on the host. */
  availability: HostAvailability;
  backupRequired: boolean;
  manual: ManualUpdate[];
  /** How long each stage takes; null holds a job at each stage until advance(). */
  stageMs: number | null;
  /** The status's pollAfterMs while a job is active; ghost-docker answers 2000. */
  activePollMs: number;
  /** Answered by GET /v1. Any other than PROTOCOL is sent unvalidated, as an incompatible host. */
  protocol: number;
}

export type FakeUpgradeHostOptions = Partial<FakeUpgradeHostSettings> & {
  port?: number;
};

interface FakeJob {
  id: string;
  component: string;
  fromVersion: string;
  toVersion: string;
  outcome: UpgradeOutcome;
  createdAt: number;
  // Only used while stages are advanced by hand.
  stage: number;
  stageChangedAt: number;
  applied: boolean;
}

const BACKUP = 'backups/20261015-120000';

function diagnostic(
  code: string,
  severity: UpgradeDiagnostic['severity'],
  message: string,
  details?: string,
): UpgradeDiagnostic {
  return { source: 'ghost-docker', code, severity, message, ...(details && { details }) };
}

const finalDiagnostics: Record<UpgradeOutcome, UpgradeDiagnostic[]> = {
  done: [
    diagnostic('backup', 'info', `Before the update, the site was backed up to \`${BACKUP}\`.`),
  ],
  restored: [
    diagnostic(
      'verify-failed',
      'error',
      'Ghost did not start on the new version.',
      `The site was restored from \`${BACKUP}\`.`,
    ),
  ],
  'needs-operator': [
    diagnostic(
      'restore-failed',
      'error',
      'The automatic restore did not finish.',
      `In the site directory, run \`./ghost-docker check\`, then \`./ghost-docker restore --yes ${BACKUP}\`.`,
    ),
  ],
  refused: [
    diagnostic(
      'version-mismatch',
      'warning',
      'The image did not report the version that was requested.',
    ),
  ],
  interrupted: [
    diagnostic(
      'interrupted',
      'error',
      'The upgrade supervisor stopped part way through this update. It is never resumed.',
      'In the site directory, run `./ghost-docker check` before trying again.',
    ),
  ],
};

const availabilityDiagnostics: Record<Exclude<HostAvailability, 'ready'>, UpgradeDiagnostic[]> = {
  busy: [diagnostic('busy', 'warning', 'Another operation is changing this site.')],
  unavailable: [
    diagnostic(
      'lock-held',
      'error',
      'An earlier update did not finish.',
      'In the site directory, run `./ghost-docker check`.',
    ),
  ],
};

/**
 * A fake ghost-docker upgrade supervisor: HTTP protocol 1 on a port,
 * for Ghost's real HttpUpgradeAdapter. Accepted jobs walk through the executor's stages
 * on a timer, or by hand, to the configured outcome.
 */
export class FakeUpgradeHost extends FakeServer {
  private settings: FakeUpgradeHostSettings;
  private readonly jobsById = new Map<string, FakeJob>();
  private readonly _requests: CreateUpgradeRequest[] = [];
  private readonly _violations: string[] = [];

  constructor(options: FakeUpgradeHostOptions = {}) {
    const { port, ...settings } = options;
    super({ port, debugNamespace: 'e2e:fake-upgrade-host' });
    this.settings = {
      currentVersion: '6.0.0',
      targetVersion: '6.1.0',
      outcome: 'done',
      availability: 'ready',
      backupRequired: true,
      manual: DEFAULT_MANUAL_UPDATES,
      stageMs: 1000,
      activePollMs: 2000,
      protocol: PROTOCOL,
      ...settings,
    };
  }

  configure(settings: Partial<FakeUpgradeHostSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /** Requests the host accepted as well-formed, replays included. */
  get requests(): CreateUpgradeRequest[] {
    return [...this._requests];
  }

  get jobs(): UpgradeJob[] {
    return [...this.jobsById.values()].map((job) => this.view(job));
  }

  /** Responses the fake refused to send because they broke the protocol. */
  get violations(): string[] {
    return [...this._violations];
  }

  /** Moves the active job to its next stage, when stages are advanced by hand. */
  advance(): UpgradeJob {
    if (this.settings.stageMs !== null) {
      throw new Error('advance() needs stageMs: null');
    }
    const job = this.activeJob();
    if (!job) {
      throw new Error('No job is active');
    }
    job.stage += 1;
    job.stageChangedAt = Date.now();
    return this.view(job);
  }

  /** Moves the active job through its remaining stages to its final state. */
  finish(): UpgradeJob {
    let job = this.advance();
    while (this.activeJob()) {
      job = this.advance();
    }
    return job;
  }

  protected setupRoutes(): void {
    // ghost-docker takes request bodies of up to 4 KiB, whatever their content type.
    this.app.use(express.json({ limit: '4kb', type: () => true }));

    this.app.get('/v1', (_req, res) => {
      if (this.settings.protocol !== PROTOCOL) {
        res.status(200).json({ protocol: this.settings.protocol });
        return;
      }
      this.send(res, 200, 'handshake', { protocol: PROTOCOL });
    });

    this.app.get('/v1/status', (_req, res) => {
      this.send(res, 200, 'status', this.status());
    });

    this.app.post('/v1/requests', (req, res) => {
      this.handleRequest(req.body, res);
    });

    this.app.get('/v1/jobs/:id', (req, res) => {
      const { id } = req.params;
      if (!upgradeJobIdSchema.safeParse(id).success) {
        this.reject(res, 400, 'malformed');
        return;
      }
      const job = this.jobsById.get(id);
      this.send(res, 200, 'lookup', job ? this.view(job) : { id, state: 'unknown' });
    });

    this.app.all(['/v1', '/v1/status', '/v1/requests', '/v1/jobs/:id'], (_req, res) => {
      this.reject(res, 405, 'method-not-allowed');
    });

    this.app.use((_req, res) => {
      this.reject(res, 404, 'not-found');
    });

    this.app.use(
      (
        error: { type?: string },
        _req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        if (error.type === 'entity.too.large') {
          this.reject(res, 413, 'too-large');
        } else if (error.type === 'entity.parse.failed') {
          this.reject(res, 400, 'malformed');
        } else {
          next(error);
        }
      },
    );
  }

  // Decided in ghost-docker's order: a replay is answered before availability or policy.
  private handleRequest(body: unknown, res: express.Response): void {
    const parsed = createUpgradeRequestSchema.safeParse(body);
    if (!parsed.success) {
      this.reject(res, 400, 'malformed');
      return;
    }
    const request = parsed.data;
    this._requests.push(request);

    const earlier = this.jobsById.get(request.idempotencyKey);
    if (earlier) {
      if (earlier.component !== request.component || earlier.toVersion !== request.toVersion) {
        this.reject(res, 409, 'idempotency-conflict');
        return;
      }
      this.send(res, 200, 'job', this.view(earlier));
      return;
    }

    const { availability } = this.settings;
    if (availability === 'unavailable') {
      this.reject(res, 503, 'unavailable', availabilityDiagnostics.unavailable);
      return;
    }
    if (availability === 'busy' || this.activeJob()) {
      this.reject(res, 409, 'busy', availabilityDiagnostics.busy);
      return;
    }
    const offered = this.oneClick().some(
      (update) => update.component === request.component && update.toVersion === request.toVersion,
    );
    if (!offered) {
      this.reject(res, 422, 'target-unapproved');
      return;
    }

    const now = Date.now();
    // ghost-docker uses the idempotency key itself as the job ID.
    const job: FakeJob = {
      id: request.idempotencyKey,
      component: request.component,
      fromVersion: this.settings.currentVersion,
      toVersion: request.toVersion,
      outcome: this.settings.outcome,
      createdAt: now,
      stage: 0,
      stageChangedAt: now,
      applied: false,
    };
    this.jobsById.set(job.id, job);
    this.debug(`Accepted job ${job.id} ending ${job.outcome}`);
    this.send(res, 202, 'job', this.view(job));
  }

  private oneClick() {
    const { currentVersion, targetVersion } = this.settings;
    return currentVersion === targetVersion
      ? []
      : [{ component: 'ghost', fromVersion: currentVersion, toVersion: targetVersion }];
  }

  private status(): UpgradeStatus {
    const active = this.activeJob();
    const availability = active ? 'busy' : this.settings.availability;
    return {
      supported: true,
      availability,
      backupRequired: this.settings.backupRequired,
      currentVersion: this.settings.currentVersion,
      oneClick: this.oneClick(),
      manual: this.settings.manual,
      activeJobId: active?.id ?? null,
      pollAfterMs: active ? this.settings.activePollMs : 30000,
      diagnostics: availability === 'ready' || active ? [] : availabilityDiagnostics[availability],
    };
  }

  private stageIndex(job: FakeJob): number {
    const last = stagesFor[job.outcome].length - 1;
    const { stageMs } = this.settings;
    const index = stageMs === null ? job.stage : Math.floor((Date.now() - job.createdAt) / stageMs);
    return Math.min(index, last);
  }

  private activeJob(): FakeJob | undefined {
    return [...this.jobsById.values()].find(
      (job) => this.stageIndex(job) < stagesFor[job.outcome].length - 1,
    );
  }

  private view(job: FakeJob): UpgradeJob {
    const stages = stagesFor[job.outcome];
    const index = this.stageIndex(job);
    const state = stages[index];
    const final = index === stages.length - 1;
    if (final && state === 'done' && !job.applied) {
      job.applied = true;
      this.settings.currentVersion = job.toVersion;
    }
    const { stageMs } = this.settings;
    const updatedAt = stageMs === null ? job.stageChangedAt : job.createdAt + index * stageMs;
    return {
      id: job.id,
      state,
      component: job.component,
      fromVersion: job.fromVersion,
      toVersion: job.toVersion,
      createdAt: new Date(job.createdAt).toISOString(),
      updatedAt: new Date(updatedAt).toISOString(),
      ...(final && { diagnostics: finalDiagnostics[job.outcome] }),
    };
  }

  private reject(
    res: express.Response,
    statusCode: number,
    code: FakeUpgradeErrorCode,
    diagnostics?: UpgradeDiagnostic[],
  ): void {
    this.send(res, statusCode, 'error', { error: { code, ...(diagnostics && { diagnostics }) } });
  }

  private send(res: express.Response, statusCode: number, kind: ResponseKind, body: unknown) {
    const result = responseSchemas[kind].safeParse(body);
    if (!result.success) {
      const message = `The fake upgrade host broke the protocol with this ${kind} body: ${z.prettifyError(result.error)}`;
      this._violations.push(message);
      throw new Error(message);
    }
    res.status(statusCode).json(body);
  }
}
