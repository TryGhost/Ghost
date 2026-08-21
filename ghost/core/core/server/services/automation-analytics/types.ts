import type {Knex} from 'knex';
import type {DatabaseDate} from '../../lib/db-date';

export type AutomationRunSnapshot = {
    id: string;
    automation_id: string;
    created_at: DatabaseDate;
    updated_at: DatabaseDate;
};

export type AutomationRunStepSnapshot = {
    id: string;
    automation_run_id: string;
    automation_action_revision_id: string;
    created_at: DatabaseDate;
    updated_at: DatabaseDate;
    ready_at: DatabaseDate;
    started_at: DatabaseDate | null;
    finished_at: DatabaseDate | null;
    status: string;
    step_attempts: number;
};

export type AutomationAnalyticsSyncBatch = {
    runs: AutomationRunSnapshot[];
    steps: AutomationRunStepSnapshot[];
};

export type AutomationBrowseStats = {
    last_run_created_at: Date | null;
    total_run_count: number;
    in_progress_run_count: number;
};

export interface AutomationAnalytics {
    enqueue(trx: Knex.Transaction, batch: AutomationAnalyticsSyncBatch): Promise<void>;
    isConfigured(): boolean;
    fetchStats(): Promise<Map<string, AutomationBrowseStats>>;
}

export type TinybirdAutomationRun = {
    site_uuid: string;
    id: string;
    automation_id: string;
    created_at: string;
    updated_at: string;
    version: 1;
};

export type TinybirdAutomationRunStep = {
    site_uuid: string;
    id: string;
    automation_run_id: string;
    automation_action_revision_id: string;
    created_at: string;
    updated_at: string;
    ready_at: string;
    started_at: string | null;
    finished_at: string | null;
    status: string;
    step_attempts: number;
    version: 1 | 2;
};

export type TinybirdAutomationSyncBatch = {
    runs: TinybirdAutomationRun[];
    steps: TinybirdAutomationRunStep[];
};
