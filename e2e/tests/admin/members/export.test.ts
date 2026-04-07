import {MembersListPage} from '@/admin-pages';
import {runMembersExportTests} from '@/tests/admin/members/shared/export-suite';

runMembersExportTests({
    suiteName: 'Ghost Admin - Members Export',
    labs: {membersForward: true},
    createPage: page => new MembersListPage(page)
});
