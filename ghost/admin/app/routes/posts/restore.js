import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class RevisionsRoute extends AuthenticatedRoute {
    @service localRevisions;

    model() {
        const revisions = this.localRevisions.findAll();
        const parsedRevisions = Object.entries(revisions);
        console.log('parsedRevisions', parsedRevisions); 
        return parsedRevisions;
    }
}