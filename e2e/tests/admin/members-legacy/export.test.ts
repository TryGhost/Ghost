import {MembersPage} from '@/helpers/pages';
import {runMembersExportTests} from '@/tests/admin/members/shared/export-suite';

runMembersExportTests({
    suiteName: 'Ghost Admin - Member Export',
    labs: {membersForward: false},
    createPage: page => new MembersPage(page)
});
