import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class RevisionsRoute extends AuthenticatedRoute {
    @service localRevisions;

    model() {
        return this.localRevisions.findAll();
    }
}