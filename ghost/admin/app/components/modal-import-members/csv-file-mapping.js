import Component from '@glimmer/component';
import MemberImportError from 'ghost-admin/errors/member-import-error';
import papaparse from 'papaparse';
import {action} from '@ember/object';
import {isNone} from '@ember/utils';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class CsvFileMapping extends Component {
    @tracked error = null;
    @tracked fileData = null;
    @tracked labels = null;

    @service membersStats;

    constructor(...args) {
        super(...args);
        this.parseFileAndGenerateMapping(this.args.file);
    }

    parseFileAndGenerateMapping(file) {
        papaparse.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => {
                if (result.data && result.data.length) {
                    this.fileData = result.data;
                } else {
                    this.fileData = [];
                }
                this.args.setFileData(this.fileData);
            }
        });
    }

    get hasFileData() {
        return !isNone(this.fileData);
    }

    @action
    setMapping(mapping) {
        if (this.fileData.length === 0) {
            this.error = new MemberImportError({
                message: 'File is empty, nothing to import. Please select a different file.'
            });
        } else if (!mapping.getKeyByValue('email')) {
            this.error = new MemberImportError({
                message: 'Please map "Email" to one of the fields in the CSV.'
            });
        } else {
            this.error = null;
        }

        this.mapping = mapping;
        this.setMappingResult();
    }

    @action
    updateLabels(labels) {
        this.labels = labels;
        this.setMappingResult();
    }

    setMappingResult() {
        this.args.setMappingResult({
            mapping: this.mapping,
            labels: this.labels,
            membersCount: this.fileData?.length,
            error: this.error
        });
    }
}
