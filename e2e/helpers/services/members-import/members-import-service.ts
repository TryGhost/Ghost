import assert from 'node:assert/strict';
import {HttpClient as APIRequest} from '@/data-factory';

export interface MemberImportData {
    email: string;
    name?: string;
    note?: string;
    subscribed_to_emails?: boolean;
    labels?: string[];
    created_at?: string; // ISO 8601 format for backdating
    complimentary_plan?: boolean;
    stripe_customer_id?: string;
    tiers?: string;
}

export interface MemberImportStats {
    imported: number;
    invalid: Array<{
        error: string;
        email?: string;
    }>;
}

export interface MemberImportLabel {
    name: string;
    slug: string;
}

export interface MemberImportResponse {
    meta: {
        stats: MemberImportStats;
        import_label: MemberImportLabel;
    };
}

export interface MembersListResponse {
    members: Array<{
        id: string;
        email: string;
        created_at: string;
    }>;
    meta: {
        pagination: {
            total: number;
        };
    };
}

export interface ImportMembersOptions {
    pollingTimeout?: number; // milliseconds, default 30000
    pollingInterval?: number; // milliseconds, default 500
    labels?: string[]; // Additional labels to apply to imported members
}

export class MembersImportService {
    private readonly request: APIRequest;
    private readonly adminEndpoint: string;

    constructor(request: APIRequest) {
        this.request = request;
        this.adminEndpoint = '/ghost/api/admin';
    }

    /**
     * Import members from an array of member objects
     * @param members Array of member data to import
     * @param options Import configuration options
     * @returns Import response with stats and import label
     */
    async import(
        members: MemberImportData[],
        options: ImportMembersOptions = {}
    ): Promise<MemberImportResponse> {
        const {
            pollingTimeout = 30000,
            pollingInterval = 500,
            labels = []
        } = options;
        const initialCount = await this.getMemberCount();
        const csvBuffer = this.generateCSVBuffer(members);

        const {response: importResponse, statusCode} = await this.uploadCSV(csvBuffer, labels);

        // Ghost returns 202 for background imports, 201 for immediate imports
        const shouldPollForCompletion = statusCode === 202;
        if (shouldPollForCompletion) {
            await this.waitForImportCompletion(
                initialCount,
                members.length,
                pollingTimeout,
                pollingInterval
            );
        }
        return importResponse;
    }

    /**
     * Generate a CSV buffer from member data
     * @param members Array of member data
     * @returns Buffer containing CSV content
     */
    private generateCSVBuffer(members: MemberImportData[]): Buffer {
        assert(members.length > 0, 'Member array must not be empty to generate CSV');
        const csvContent = this.generateCSV(members);
        return Buffer.from(csvContent, 'utf-8');
    }

    /**
     * Generate CSV content from member data
     * @param members Array of member data
     * @returns CSV string content
     */
    private generateCSV(members: MemberImportData[]): string {
        const headers = [
            'email',
            'name',
            'note',
            'subscribed_to_emails',
            'labels',
            'created_at',
            'complimentary_plan',
            'stripe_customer_id',
            'tiers'
        ];

        const rows = members.map((member) => {
            const labelString = member.labels ? member.labels.join(',') : '';
            return [
                this.escapeCSVField(member.email),
                this.escapeCSVField(member.name || ''),
                this.escapeCSVField(member.note || ''),
                member.subscribed_to_emails !== undefined ? String(member.subscribed_to_emails) : '',
                this.escapeCSVField(labelString),
                member.created_at || '',
                member.complimentary_plan !== undefined ? String(member.complimentary_plan) : '',
                member.stripe_customer_id || '',
                this.escapeCSVField(member.tiers || '')
            ].join(',');
        });

        // Combine headers and rows
        return [headers.join(','), ...rows].join('\n');
    }

    /**
     * Escape CSV field value (handle commas, quotes, newlines)
     * @param value Field value to escape
     * @returns Escaped field value
     */
    private escapeCSVField(value: string): string {
        if (!value) {
            return '';
        }
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    /**
     * Upload CSV buffer to members import endpoint
     * @param csvBuffer Buffer containing CSV data
     * @param labels Additional labels to apply
     * @returns Import response with status code
     */
    private async uploadCSV(
        csvBuffer: Buffer,
        labels: string[] = []
    ): Promise<{response: MemberImportResponse; statusCode: number}> {
        // Prepare multipart form data
        const response = await this.request.post(`${this.adminEndpoint}/members/upload/`, {
            multipart: {
                membersfile: {
                    name: `members-import-${Date.now()}.csv`,
                    mimeType: 'text/csv',
                    buffer: csvBuffer
                },
                ...(labels.length > 0 && {
                    labels: JSON.stringify(labels.map(label => ({name: label})))
                })
            }
        });
        if (!response.ok()) {
            const errorText = await response.text();
            throw new Error(`Failed to upload members CSV: ${response.status()} - ${errorText}`);
        }

        const statusCode = response.status();
        const data = await response.json() as MemberImportResponse;

        return {response: data, statusCode};
    }

    /**
     * Get current member count
     * @returns Total number of members
     */
    private async getMemberCount(): Promise<number> {
        const response = await this.request.get(`${this.adminEndpoint}/members/?limit=1`);

        if (!response.ok()) {
            throw new Error(`Failed to get member count: ${response.status()}`);
        }

        const data = await response.json() as MembersListResponse;
        return data.meta.pagination.total;
    }

    /**
     * Wait for member import to complete by polling member count
     * @param initialCount Member count before import
     * @param expectedIncrease Expected number of new members
     * @param timeout Maximum time to wait in milliseconds
     * @param interval Polling interval in milliseconds
     */
    private async waitForImportCompletion(
        initialCount: number,
        expectedIncrease: number,
        timeout: number,
        interval: number
    ): Promise<void> {
        const expectedCount = initialCount + expectedIncrease;
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const currentCount = await this.getMemberCount();

            if (currentCount >= expectedCount) {
                // Import completed successfully
                return;
            }

            await new Promise((resolve) => {
                setTimeout(resolve, interval);
            });
        }

        // Timeout reached
        const finalCount = await this.getMemberCount();
        throw new Error(
            `Member import did not complete within ${timeout}ms. ` +
            `Expected ${expectedCount} members, got ${finalCount}`
        );
    }
}
