import type {Knex} from 'knex';
import {TableImporter} from './table-importer';
// @ts-expect-error This module currently lacks type definitions.
import dateToDatabaseString from '../utils/database-date';

type AutomationRun = {
    id: string;
    automation_id: string;
    created_at: string;
};

type ActionRevision = {
    action_id: string;
    automation_id: string;
    revision_id: string;
    revision_created_at: string;
};

type ActionEdge = {
    source_action_id: string;
    target_action_id: string;
};

type AutomationRunStep = {
    id: string;
    created_at: string;
    updated_at: string;
    automation_run_id: string;
    automation_action_revision_id: string;
    ready_at: string;
    step_attempts: number;
    started_at: string | null;
    finished_at: string | null;
    status: 'pending' | 'finished';
    locked_by: null;
    locked_at: null;
};

class AutomationRunStepsImporter extends TableImporter<AutomationRunStep> {
    static table = 'automation_run_steps';
    static dependencies = ['automation_runs', 'automation_action_revisions', 'automation_action_edges'];

    defaultQuantity = 40;

    constructor(knex: Knex, transaction: Knex.Transaction) {
        super(AutomationRunStepsImporter.table, knex, transaction);
    }

    async import(quantity = this.defaultQuantity): Promise<void> {
        const runs = await this.transaction.select('id', 'automation_id', 'created_at').from<AutomationRun>('automation_runs');
        if (runs.length === 0 || quantity === 0) {
            return;
        }

        const actionRevisions = await this.transaction('automation_actions as action')
            .select(
                'action.id as action_id',
                'action.automation_id as automation_id',
                'revision.id as revision_id',
                'revision.created_at as revision_created_at'
            )
            .innerJoin('automation_action_revisions as revision', 'revision.action_id', 'action.id') as ActionRevision[];
        const edges = await this.transaction.select('source_action_id', 'target_action_id').from<ActionEdge>('automation_action_edges');

        const latestRevisionByAction = new Map<string, ActionRevision>();
        for (const revision of actionRevisions) {
            const latest = latestRevisionByAction.get(revision.action_id);
            if (!latest || revision.revision_created_at > latest.revision_created_at || (revision.revision_created_at === latest.revision_created_at && revision.revision_id > latest.revision_id)) {
                latestRevisionByAction.set(revision.action_id, revision);
            }
        }

        const targetActionIds = new Set(edges.map(edge => edge.target_action_id));
        const nextActionBySource = new Map(edges.map(edge => [edge.source_action_id, edge.target_action_id]));
        const revisionsByAutomation = new Map<string, ActionRevision[]>();

        for (const revision of latestRevisionByAction.values()) {
            if (targetActionIds.has(revision.action_id)) {
                continue;
            }

            const path: ActionRevision[] = [];
            let current: ActionRevision | undefined = revision;
            while (current) {
                path.push(current);
                const nextActionId = nextActionBySource.get(current.action_id);
                current = nextActionId ? latestRevisionByAction.get(nextActionId) : undefined;
            }
            revisionsByAutomation.set(revision.automation_id, path);
        }

        const steps: AutomationRunStep[] = [];
        const stepsPerRun = quantity / runs.length;
        let fractionalCarry = 0;

        for (const run of runs) {
            const revisions = revisionsByAutomation.get(run.automation_id) ?? [];
            fractionalCarry += stepsPerRun % 1;
            const extraStep = fractionalCarry >= 1 ? 1 : 0;
            fractionalCarry -= extraStep;
            const runStepCount = Math.min(Math.floor(stepsPerRun) + extraStep, revisions.length);
            const runCreatedAt = dateToDatabaseString.parse(run.created_at);

            for (let index = 0; index < runStepCount; index += 1) {
                const createdAt = new Date(runCreatedAt);
                createdAt.setHours(createdAt.getHours() + index);
                const createdAtString = dateToDatabaseString(createdAt);
                const isPending = index === runStepCount - 1;

                steps.push({
                    id: this.fastFakeObjectId(),
                    created_at: createdAtString,
                    updated_at: createdAtString,
                    automation_run_id: run.id,
                    automation_action_revision_id: revisions[index].revision_id,
                    ready_at: createdAtString,
                    step_attempts: isPending ? 0 : 1,
                    started_at: isPending ? null : createdAtString,
                    finished_at: isPending ? null : createdAtString,
                    status: isPending ? 'pending' : 'finished',
                    locked_by: null,
                    locked_at: null
                });
            }
        }

        if (steps.length > 0) {
            await this.batchInsert(steps);
        }
    }
}

module.exports = AutomationRunStepsImporter;
