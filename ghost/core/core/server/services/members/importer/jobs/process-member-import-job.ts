/** Runs a member CSV import in the background; live services resolve from the importer's getters. */
export default class ProcessMemberImportJob {
    static type = 'process-member-import';

    readonly data: {
        filePath: string;
        emailRecipient: string;
        importLabel: {name: string} | null;
    };

    constructor(data: {filePath: string; emailRecipient: string; importLabel: {name: string} | null}) {
        this.data = data;
    }
}
