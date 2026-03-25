import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class MembersController extends Controller {
    @service membersStats;

    queryParams = [
        'filter',
        'search',
        {postAnalytics: 'post'}
    ];

    filter = null;
    search = '';
    postAnalytics = null;

    @action
    refreshData() {
        if (window.adminXQueryClient) {
            window.adminXQueryClient.invalidateQueries({queryKey: ['MembersResponseType']});
            window.adminXQueryClient.invalidateQueries({queryKey: ['LabelsResponseType']});
        }

        this.membersStats.invalidate();
        this.membersStats.fetchCounts();
        this.membersStats.fetchMemberCount();
    }
}
