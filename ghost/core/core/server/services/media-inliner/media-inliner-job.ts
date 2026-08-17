import {Job} from '../jobs-service/job';

interface MediaInlinerJobData {
    domains: string[];
}

export default class MediaInlinerJob extends Job {
    static type = 'media-inliner';

    domains: string[];

    constructor(data: MediaInlinerJobData) {
        super();
        this.domains = data.domains;
    }
}
