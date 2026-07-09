export interface ImportOptions {
    user: {email: string};
    importTag?: string | null;
}

/** Carries the persisted file path; the handler re-enters importFromFile with runningInJob set. */
export default class ImportContentJob {
    static type = 'import-content';

    readonly data: {
        filePath: string;
        fileName: string;
        importOptions: ImportOptions;
    };

    constructor(data: {filePath: string; fileName: string; importOptions: ImportOptions}) {
        this.data = data;
    }
}
